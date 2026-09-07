<?php
// POST /api/revoke-password.php - disables password login entirely,
// leaving passkeys as the only way in. Requires an authenticated session
// and at least one registered passkey (otherwise this would permanently
// lock everyone out, with no recovery path from the UI).
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_method('POST');
clr_require_auth();

if (clr_passkey_count($clrDb) === 0) {
    clr_json_error(409, 'Register a passkey first - revoking the password with no passkey registered would lock everyone out.');
}

$clrDb->exec('UPDATE auth SET password_hash = NULL WHERE id = 1');

clr_json(['ok' => true]);
