<?php
// POST /api/webauthn-register-verify.php { clientDataJSON, attestationObject, label? }
// Requires an authenticated session. Verifies the browser's response to
// the options from webauthn-register-options.php and stores the new
// passkey.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_method('POST');
clr_require_auth();

$body = clr_read_json_body();
$clientDataJSON = clr_base64url_decode((string) ($body['clientDataJSON'] ?? ''));
$attestationObject = clr_base64url_decode((string) ($body['attestationObject'] ?? ''));
$label = trim((string) ($body['label'] ?? ''));
if ($label === '') {
    $label = null;
} elseif (mb_strlen($label) > 100) {
    $label = mb_substr($label, 0, 100);
}

$challenge = isset($_SESSION['webauthn_challenge']) ? base64_decode($_SESSION['webauthn_challenge']) : null;
if (!$challenge) {
    clr_json_error(400, 'No pending passkey registration for this session.');
}

$webAuthn = clr_webauthn();

try {
    $data = $webAuthn->processCreate($clientDataJSON, $attestationObject, $challenge, true);
} catch (Throwable $e) {
    clr_json_error(400, 'Could not verify the new passkey: ' . $e->getMessage());
}

unset($_SESSION['webauthn_challenge']);

$credentialId = clr_base64url_encode($data->credentialId);

$stmt = $clrDb->prepare(
    'INSERT INTO webauthn_credentials (id, public_key, sign_count, label)
     VALUES (:id, :public_key, :sign_count, :label)',
);
$stmt->execute([
    ':id' => $credentialId,
    ':public_key' => $data->credentialPublicKey,
    ':sign_count' => $data->signatureCounter ?? 0,
    ':label' => $label,
]);

clr_json(['ok' => true]);
