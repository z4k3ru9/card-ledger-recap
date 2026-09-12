<?php
// POST /api/webauthn-login-verify.php
// { id, clientDataJSON, authenticatorData, signature, userHandle }
// (all base64url) - public. Verifies the browser's response to the
// options from webauthn-login-options.php and, on success, logs this
// browser in exactly like a password login would.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_method('POST');

$body = clr_read_json_body();
$id = clr_base64url_decode((string) ($body['id'] ?? ''));
$clientDataJSON = clr_base64url_decode((string) ($body['clientDataJSON'] ?? ''));
$authenticatorData = clr_base64url_decode((string) ($body['authenticatorData'] ?? ''));
$signature = clr_base64url_decode((string) ($body['signature'] ?? ''));
$userHandle = clr_base64url_decode((string) ($body['userHandle'] ?? ''));

$challenge = isset($_SESSION['webauthn_challenge']) ? base64_decode($_SESSION['webauthn_challenge']) : null;
if (!$challenge) {
    clr_json_error(400, 'No pending passkey sign-in for this session.');
}

$credentialId = clr_base64url_encode($id);
$stmt = $clrDb->prepare('SELECT public_key, sign_count FROM webauthn_credentials WHERE id = :id');
$stmt->execute([':id' => $credentialId]);
$credential = $stmt->fetch();

if (!$credential) {
    clr_json_error(401, 'This passkey is not registered.');
}

$expectedUserId = clr_webauthn_user_id($clrDb);
if (!hash_equals($expectedUserId, $userHandle)) {
    clr_json_error(401, 'This passkey does not belong to this account.');
}

$webAuthn = clr_webauthn();

try {
    $webAuthn->processGet(
        $clientDataJSON,
        $authenticatorData,
        $signature,
        $credential['public_key'],
        $challenge,
        (int) $credential['sign_count'],
        true,
    );
} catch (Throwable $e) {
    clr_json_error(401, 'Passkey sign-in failed: ' . $e->getMessage());
}

unset($_SESSION['webauthn_challenge']);

$newSignCount = $webAuthn->getSignatureCounter();
$update = $clrDb->prepare(
    'UPDATE webauthn_credentials SET sign_count = :sign_count, last_used_at = NOW() WHERE id = :id',
);
$update->execute([
    ':sign_count' => $newSignCount ?? $credential['sign_count'],
    ':id' => $credentialId,
]);

session_regenerate_id(true);
$_SESSION['authenticated'] = true;

clr_json(['authenticated' => true]);
