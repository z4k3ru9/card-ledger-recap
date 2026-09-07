<?php
// GET /api/status.php - tells the frontend which screen to show: whether
// the shared app password has been set up yet, whether this browser is
// currently logged in, and the passkey state (whether password login is
// still enabled, and how many passkeys exist) so the login screen knows
// whether to offer a password field at all.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_method('GET');

$row = $clrDb->query('SELECT COUNT(*) AS c, MAX(password_hash IS NOT NULL) AS has_password FROM auth')->fetch();
$needsSetup = ((int) $row['c']) === 0;

clr_json([
    'needsSetup' => $needsSetup,
    'authenticated' => clr_is_authenticated(),
    'passwordEnabled' => $needsSetup ? true : (bool) $row['has_password'],
    'passkeyCount' => clr_passkey_count($clrDb),
]);
