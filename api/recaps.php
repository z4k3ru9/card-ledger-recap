<?php
// GET  /api/recaps.php - every month's recap, as { "YYYY-MM": {...}, ... }
// POST /api/recaps.php { month, recap } - upserts one month's recap
//
// Both require an authenticated session.
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/recap.php';

clr_require_auth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $clrDb->query('SELECT month, data, revision FROM recaps')->fetchAll();
    $recaps = [];
    $revisions = [];
    foreach ($rows as $row) {
        $decoded = json_decode($row['data'], true);
        if (is_array($decoded)) {
            $recaps[$row['month']] = $decoded;
            $revisions[$row['month']] = (int) $row['revision'];
        }
    }
    clr_json(['recaps' => $recaps, 'revisions' => $revisions]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = clr_read_json_body(1048576, 12);
    $idempotencyKey = clr_idempotency_key($body);
    $requestHash = hash('sha256', json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    $replay = clr_idempotency_replay($clrDb, 'recaps.post', $idempotencyKey, $requestHash);
    if ($replay !== null) {
        clr_json($replay['body'], $replay['status']);
    }
    $month = (string) ($body['month'] ?? '');
    $expectedRevision = $body['expectedRevision'] ?? null;

    clr_validate_month($month);
    if (!is_int($expectedRevision) || $expectedRevision < 0) {
        clr_json_error(400, 'Missing or invalid expectedRevision.', 'invalid_recap');
    }
    $recap = clr_validate_recap($body['recap'] ?? null);

    try {
        $json = json_encode($recap, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    } catch (JsonException $e) {
        clr_json_error(400, 'Recap cannot be encoded.', 'invalid_recap');
    }

    $clrDb->beginTransaction();
    try {
        $select = $clrDb->prepare('SELECT revision FROM recaps WHERE month = :month FOR UPDATE');
        $select->execute([':month' => $month]);
        $row = $select->fetch();
        $actualRevision = $row ? (int) $row['revision'] : 0;
        if ($actualRevision !== $expectedRevision) {
            $clrDb->rollBack();
            $response = ['error' => 'This month was changed elsewhere. Reload before saving again.', 'code' => 'recap_conflict'];
            clr_idempotency_store($clrDb, 'recaps.post', $idempotencyKey, $requestHash, 409, $response);
            clr_json($response, 409);
        }

        $nextRevision = $actualRevision + 1;
        if ($row) {
            $stmt = $clrDb->prepare(
                'UPDATE recaps SET data = :data, revision = :next_revision
                 WHERE month = :month AND revision = :expected_revision',
            );
            $stmt->execute([
                ':data' => $json,
                ':next_revision' => $nextRevision,
                ':month' => $month,
                ':expected_revision' => $expectedRevision,
            ]);
            if ($stmt->rowCount() !== 1) {
                throw new RuntimeException('Recap compare-and-swap update failed.');
            }
        } else {
            $stmt = $clrDb->prepare(
                'INSERT INTO recaps (month, data, revision) VALUES (:month, :data, :revision)',
            );
            $stmt->execute([':month' => $month, ':data' => $json, ':revision' => $nextRevision]);
        }
        $clrDb->commit();
    } catch (PDOException $e) {
        if ($clrDb->inTransaction()) {
            $clrDb->rollBack();
        }
        // A concurrent first write can race between the SELECT and INSERT;
        // expose that as the same explicit conflict rather than a 500.
        if ($e->getCode() === '23000') {
            clr_json_error(409, 'This month was changed elsewhere. Reload before saving again.', 'recap_conflict');
        }
        throw $e;
    } catch (Throwable $e) {
        if ($clrDb->inTransaction()) {
            $clrDb->rollBack();
        }
        throw $e;
    }

    $response = ['ok' => true, 'revision' => $nextRevision];
    clr_idempotency_store($clrDb, 'recaps.post', $idempotencyKey, $requestHash, 200, $response);
    clr_json($response);
}

clr_json_error(405, 'Expected GET or POST.');
