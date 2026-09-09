<?php
// POST /api/webauthn-login-options.php - public (this is how you log in,
// so it has to work without a session yet). Returns the options to pass
// to navigator.credentials.get(). No credential IDs are listed - the
// authenticator looks up whichever passkey it already holds for this
// site (a discoverable/resident credential), so there's no username step.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';
require __DIR__ . '/lib/rate_limit.php';

clr_require_method('POST');
clr_require_webauthn_origin();
clr_rate_limit_consume($clrDb, 'passkey_options', 20, 300);

if (clr_passkey_count($clrDb) === 0) {
    clr_json_error(404, 'No passkeys are registered yet.');
}

$webAuthn = clr_webauthn();
$args = $webAuthn->getGetArgs([], 60, true, true, true, true, true, 'required');

// base64-encoded, not raw binary - PHP's session serializer would embed
// raw bytes verbatim, and the sessions table stores session data as text.
$_SESSION['webauthn_challenge'] = base64_encode($webAuthn->getChallenge()->getBinaryString());

clr_json($args);
