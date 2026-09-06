<?php
// GET  /api/recaps.php - every month's recap, as { "YYYY-MM": {...}, ... }
// POST /api/recaps.php { month, recap } - upserts one month's recap
//
// Both require an authenticated session.
require __DIR__ . '/bootstrap.php';

clr_require_auth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $clrDb->query('SELECT month, data FROM recaps')->fetchAll();
    $recaps = [];
    foreach ($rows as $row) {
        $decoded = json_decode($row['data'], true);
        if (is_array($decoded)) {
            $recaps[$row['month']] = $decoded;
        }
    }
    clr_json(['recaps' => $recaps]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = clr_read_json_body();
    $month = (string) ($body['month'] ?? '');
    $recap = $body['recap'] ?? null;

    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        clr_json_error(400, 'Invalid month - expected "YYYY-MM".');
    }
    if (!is_array($recap)) {
        clr_json_error(400, 'Missing recap data.');
    }

    $stmt = $clrDb->prepare(
        'INSERT INTO recaps (month, data) VALUES (:month, :data)
         ON DUPLICATE KEY UPDATE data = :data2',
    );
    $json = json_encode($recap);
    $stmt->execute([':month' => $month, ':data' => $json, ':data2' => $json]);

    clr_json(['ok' => true]);
}

clr_json_error(405, 'Expected GET or POST.');
