<?php
// POST /api/login.php { password } - verifies against the shared app
// password and, on success, logs this browser in (MySQL-backed session
// cookie - see lib/SessionHandler.php).
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/rate_limit.php';

clr_require_method('POST');
clr_rate_limit_assert($clrDb, 'password_login', 5, 900);

$body = clr_read_json_body();
$password = (string) ($body['password'] ?? '');

$row = $clrDb->query('SELECT password_hash FROM auth WHERE id = 1')->fetch();
if (!$row || $row['password_hash'] === null) {
    clr_json_error(403, 'Password login is disabled - sign in with a passkey instead.');
}
if (!password_verify($password, $row['password_hash'])) {
    clr_rate_limit_record($clrDb, 'password_login', 900);
    error_log(json_encode(['event' => 'authentication_failed', 'method' => 'password']));
    clr_json_error(401, 'Sign-in failed.');
}

clr_rate_limit_clear($clrDb, 'password_login');
session_regenerate_id(true);
$_SESSION['authenticated'] = true;

clr_json(['authenticated' => true]);
