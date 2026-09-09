<?php

function clr_rate_limit_key(string $scope): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $scope . "\0" . $ip);
}

/** Refuse a request when the persistent fixed-window limit is exhausted. */
function clr_rate_limit_assert(PDO $db, string $scope, int $limit, int $windowSeconds): void
{
    $stmt = $db->prepare(
        'SELECT attempts, UNIX_TIMESTAMP(window_started) AS started
         FROM auth_rate_limits WHERE scope = :scope AND key_hash = :key_hash',
    );
    $stmt->execute([':scope' => $scope, ':key_hash' => clr_rate_limit_key($scope)]);
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }
    $elapsed = time() - (int) $row['started'];
    if ($elapsed < $windowSeconds && (int) $row['attempts'] >= $limit) {
        header('Retry-After: ' . max(1, $windowSeconds - $elapsed));
        clr_json_error(429, 'Too many attempts. Wait before trying again.', 'rate_limited');
    }
}

function clr_rate_limit_record(PDO $db, string $scope, int $windowSeconds): void
{
    $cutoff = gmdate('Y-m-d H:i:s', time() - $windowSeconds);
    $stmt = $db->prepare(
        'INSERT INTO auth_rate_limits (scope, key_hash, attempts, window_started, last_attempt)
         VALUES (:scope, :key_hash, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_started <= :cutoff, 1, attempts + 1),
           window_started = IF(window_started <= :cutoff2, UTC_TIMESTAMP(), window_started),
           last_attempt = UTC_TIMESTAMP()',
    );
    $stmt->execute([
        ':scope' => $scope,
        ':key_hash' => clr_rate_limit_key($scope),
        ':cutoff' => $cutoff,
        ':cutoff2' => $cutoff,
    ]);
}

function clr_rate_limit_consume(
    PDO $db,
    string $scope,
    int $limit,
    int $windowSeconds,
): void {
    clr_rate_limit_assert($db, $scope, $limit, $windowSeconds);
    clr_rate_limit_record($db, $scope, $windowSeconds);
}

function clr_rate_limit_clear(PDO $db, string $scope): void
{
    $stmt = $db->prepare('DELETE FROM auth_rate_limits WHERE scope = :scope AND key_hash = :key_hash');
    $stmt->execute([':scope' => $scope, ':key_hash' => clr_rate_limit_key($scope)]);
}
