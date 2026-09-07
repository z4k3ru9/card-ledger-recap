<?php
// GET  /api/webauthn-credentials.php - lists registered passkeys.
// POST /api/webauthn-credentials.php { action: "delete", id } - removes one.
// Both require an authenticated session.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/webauthn.php';

clr_require_auth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $clrDb->query(
        'SELECT id, label, created_at, last_used_at FROM webauthn_credentials ORDER BY created_at ASC',
    )->fetchAll();
    clr_json(['passkeys' => $rows]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = clr_read_json_body();
    if (($body['action'] ?? null) !== 'delete') {
        clr_json_error(400, 'Unknown action.');
    }
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        clr_json_error(400, 'Missing passkey id.');
    }

    // Never allow deleting the last passkey once the password has been
    // revoked - that would permanently lock everyone out.
    $passwordEnabled = (bool) $clrDb->query('SELECT password_hash FROM auth WHERE id = 1')->fetch()['password_hash'];
    $count = clr_passkey_count($clrDb);
    if (!$passwordEnabled && $count <= 1) {
        clr_json_error(
            409,
            'This is the last passkey and the password is disabled - deleting it would lock you out. Set a password again first (see the README) if you need to remove it.',
        );
    }

    $stmt = $clrDb->prepare('DELETE FROM webauthn_credentials WHERE id = :id');
    $stmt->execute([':id' => $id]);
    clr_json(['ok' => true]);
}

clr_json_error(405, 'Expected GET or POST.');
