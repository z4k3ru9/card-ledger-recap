<?php
// Small JSON in/out helpers shared by every endpoint.

header('Content-Type: application/json; charset=utf-8');
// Every endpoint here is either auth-sensitive or session-sensitive
// (status.php in particular must never serve a stale cached answer to
// "am I logged in / is there a passkey") - never let a browser or
// intermediary cache a response.
header('Cache-Control: no-store');

// No `: never` return type here (PHP 8.1+ only, and both of these still
// exit either way) - keeps this compatible with PHP 8.0, which is a more
// realistic minimum for shared/cPanel hosting.
function clr_json($data, int $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function clr_json_error(int $status, string $message, ?string $code = null)
{
    $body = ['error' => $message];
    if ($code !== null) {
        $body['code'] = $code;
    }
    clr_json($body, $status);
}

/** Decodes the JSON request body, or fails the request with a 400. */
function clr_read_json_body(int $maxBytes = 262144, int $maxDepth = 16): array
{
    $declaredLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declaredLength > $maxBytes) {
        clr_json_error(413, 'Request body is too large.', 'payload_too_large');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > $maxBytes) {
        clr_json_error(413, 'Request body is too large.', 'payload_too_large');
    }
    try {
        $body = $raw === '' ? [] : json_decode($raw, true, $maxDepth, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        clr_json_error(400, 'Expected a valid JSON request body.', 'invalid_json');
    }
    if (!is_array($body)) {
        clr_json_error(400, 'Expected a JSON request body.');
    }
    return $body;
}

function clr_require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        clr_json_error(405, "Expected $method.");
    }
}

/** Return a validated mutation identity from the header/body pair. */
function clr_idempotency_key(array $body): string
{
    $header = trim((string) ($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? ''));
    $client = trim((string) ($body['client_operation_id'] ?? ''));
    if ($header !== '' && $client !== '' && !hash_equals($header, $client)) {
        clr_json_error(400, 'Idempotency-Key and client_operation_id must match.', 'invalid_idempotency_key');
    }
    $key = $header !== '' ? $header : $client;
    if ($key === '' || strlen($key) > 128 || !preg_match('/^[A-Za-z0-9._:-]+$/', $key)) {
        clr_json_error(400, 'A valid Idempotency-Key is required.', 'invalid_idempotency_key');
    }
    return $key;
}

/** Replay a completed mutation, or reject reuse of a key for different input. */
function clr_idempotency_replay(PDO $db, string $scope, string $key, string $requestHash): ?array
{
    $stmt = $db->prepare(
        'SELECT request_hash, response_status, response_body
         FROM idempotency_keys WHERE scope = :scope AND idempotency_key = :key',
    );
    $stmt->execute([':scope' => $scope, ':key' => $key]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    if (!hash_equals((string) $row['request_hash'], $requestHash)) {
        clr_json_error(409, 'This idempotency key was already used for a different request.', 'idempotency_conflict');
    }
    $body = json_decode((string) $row['response_body'], true);
    if (!is_array($body)) {
        clr_json_error(500, 'Stored idempotency response is invalid.', 'idempotency_corrupt');
    }
    return ['status' => (int) $row['response_status'], 'body' => $body];
}

/** Store a final response so a lost response can be safely replayed. */
function clr_idempotency_store(
    PDO $db,
    string $scope,
    string $key,
    string $requestHash,
    int $status,
    array $body,
): void {
    $stmt = $db->prepare(
        'INSERT INTO idempotency_keys
           (scope, idempotency_key, request_hash, response_status, response_body)
         VALUES (:scope, :key, :hash, :status, :body)',
    );
    try {
        $stmt->execute([
            ':scope' => $scope,
            ':key' => $key,
            ':hash' => $requestHash,
            ':status' => $status,
            ':body' => json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() !== '23000') {
            throw $e;
        }
        // A concurrent request won the insert. Its response is authoritative;
        // the next request will replay it after this transaction completes.
    }
}
