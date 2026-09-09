<?php
// POST /api/setup.php { password } - first-run only: sets the shared app
// password and logs this browser in. Refuses once a password already
// exists (use a normal login after that).
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/rate_limit.php';

clr_require_method('POST');
clr_rate_limit_assert($clrDb, 'first_run_setup', 5, 3600);

$count = (int) $clrDb->query('SELECT COUNT(*) AS c FROM auth')->fetch()['c'];
if ($count > 0) {
    clr_json_error(409, 'A password is already set up.');
}

$body = clr_read_json_body();
$password = (string) ($body['password'] ?? '');
$providedSecret = (string) ($body['setupSecret'] ?? '');
$configuredSecret = (string) (clr_config()['setup_secret'] ?? '');
if ($configuredSecret === '' || !hash_equals($configuredSecret, $providedSecret)) {
    clr_rate_limit_record($clrDb, 'first_run_setup', 3600);
    clr_json_error(403, 'The setup secret is incorrect or not configured.');
}
if (strlen($password) < 8) {
    clr_json_error(400, 'Password must be at least 8 characters.');
}

$hash = password_hash($password, PASSWORD_BCRYPT);
try {
    $stmt = $clrDb->prepare('INSERT INTO auth (id, password_hash) VALUES (1, :hash)');
    $stmt->execute([':hash' => $hash]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        clr_json_error(409, 'Setup has already been completed.');
    }
    throw $e;
}

clr_rate_limit_clear($clrDb, 'first_run_setup');
session_regenerate_id(true);
$_SESSION['authenticated'] = true;

clr_json(['authenticated' => true]);
