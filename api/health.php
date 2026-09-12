<?php
// Non-sensitive readiness probe: verifies DB access and the schema needed by
// the current release without exposing credentials or stored recap data.
require __DIR__ . '/bootstrap.php';

clr_require_method('GET');

$requiredTables = ['auth', 'sessions', 'recaps', 'webauthn_credentials', 'auth_rate_limits', 'idempotency_keys'];
$placeholders = implode(',', array_fill(0, count($requiredTables), '?'));
$stmt = $clrDb->prepare(
    "SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name IN ($placeholders)",
);
$stmt->execute($requiredTables);
$present = array_column($stmt->fetchAll(), 'table_name');

$revision = $clrDb->query(
    "SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'recaps' AND column_name = 'revision'",
)->fetch();

if (count($present) !== count($requiredTables) || (int) $revision['c'] !== 1) {
    clr_json_error(503, 'Database schema is not ready.', 'schema_not_ready');
}

clr_json(['ready' => true]);
