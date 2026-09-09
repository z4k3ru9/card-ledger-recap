<?php
// POST /api/webauthn-register-options.php - requires an authenticated
// session (you have to already be logged in, with the password, to add a
// passkey). Returns the options to pass to navigator.credentials.create().
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_method('POST');
clr_require_auth();
clr_require_webauthn_origin();

$webAuthn = clr_webauthn();
$userId = clr_webauthn_user_id($clrDb);

// Exclude devices that already have a credential registered, so the
// authenticator doesn't offer to create a duplicate for the same device.
$existing = $clrDb->query('SELECT id FROM webauthn_credentials')->fetchAll();
$excludeIds = array_map(
    fn($row) => clr_base64url_decode($row['id']),
    $existing,
);

// requireResidentKey=true + userVerification='required': this has to be a
// real discoverable passkey (not a plain security key), since the login
// flow doesn't ask for a username first - and since a passkey may end up
// being the *only* way in (see revoke-password.php), it should always
// require a PIN/biometric check, not just a tap.
$args = $webAuthn->getCreateArgs(
    $userId,
    'shared-login',
    'Card Ledger Recap',
    60,
    true,
    'required',
    null,
    $excludeIds,
);

// base64-encoded, not raw binary - PHP's session serializer would embed
// raw bytes verbatim, and the sessions table stores session data as text.
$_SESSION['webauthn_challenge'] = base64_encode($webAuthn->getChallenge()->getBinaryString());

clr_json($args);
