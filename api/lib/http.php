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
