<?php
// POST /api/setup.php { password } - first-run only: sets the shared app
// password and logs this browser in. Refuses once a password already
// exists (use a normal login after that).
require __DIR__ . '/bootstrap.php';

clr_require_method('POST');

$count = (int) $clrDb->query('SELECT COUNT(*) AS c FROM auth')->fetch()['c'];
if ($count > 0) {
    clr_json_error(409, 'A password is already set up.');
}

$body = clr_read_json_body();
$password = (string) ($body['password'] ?? '');
if (strlen($password) < 8) {
    clr_json_error(400, 'Password must be at least 8 characters.');
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $clrDb->prepare('INSERT INTO auth (id, password_hash) VALUES (1, :hash)');
$stmt->execute([':hash' => $hash]);

session_regenerate_id(true);
$_SESSION['authenticated'] = true;

clr_json(['authenticated' => true]);
