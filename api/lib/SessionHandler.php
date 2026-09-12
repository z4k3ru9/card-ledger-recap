<?php
// Stores PHP sessions in the `sessions` MySQL table instead of the
// server's local filesystem, so the login cookie keeps working across
// app restarts / multiple web workers and can be inspected in the same
// "basic database" everything else lives in.

final class ClrSessionHandler implements SessionHandlerInterface
{
    private PDO $db;
    private int $maxLifetime;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->maxLifetime = (int) ini_get('session.gc_maxlifetime') ?: 1440;
    }

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        $stmt = $this->db->prepare(
            'SELECT data FROM sessions WHERE id = :id AND last_activity > :cutoff',
        );
        $stmt->execute([
            ':id' => $id,
            ':cutoff' => time() - $this->maxLifetime,
        ]);
        $row = $stmt->fetch();
        return $row ? $row['data'] : '';
    }

    public function write(string $id, string $data): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO sessions (id, data, last_activity) VALUES (:id, :data, :now)
             ON DUPLICATE KEY UPDATE data = :data2, last_activity = :now2',
        );
        return $stmt->execute([
            ':id' => $id,
            ':data' => $data,
            ':now' => time(),
            ':data2' => $data,
            ':now2' => time(),
        ]);
    }

    public function destroy(string $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }

    public function gc(int $max_lifetime): int|false
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE last_activity <= :cutoff');
        $stmt->execute([':cutoff' => time() - $max_lifetime]);
        return $stmt->rowCount();
    }
}

/** Starts a session backed by ClrSessionHandler, with sane cookie flags. */
function clr_start_session(PDO $db): void
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['SERVER_PORT'] ?? null) == 443
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

    session_set_save_handler(new ClrSessionHandler($db), true);
    session_name('clr_session');
    // Scope the cookie to the directory containing the deployed app. Using
    // `/` would leak a session cookie to unrelated applications on the same
    // host and is incorrect when this app is hosted below the domain root.
    $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '/api/bootstrap.php');
    $cookiePath = dirname(dirname($scriptName));
    if ($cookiePath === DIRECTORY_SEPARATOR || $cookiePath === '.') {
        $cookiePath = '/';
    } else {
        $cookiePath = rtrim(str_replace('\\', '/', $cookiePath), '/') . '/';
    }
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookiePath,
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function clr_is_authenticated(): bool
{
    return !empty($_SESSION['authenticated']);
}

function clr_require_auth(): void
{
    if (!clr_is_authenticated()) {
        clr_json_error(401, 'Not logged in.');
    }
}
