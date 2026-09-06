<?php
// Small JSON in/out helpers shared by every endpoint.

header('Content-Type: application/json; charset=utf-8');

function clr_json($data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function clr_json_error(int $status, string $message): never
{
    clr_json(['error' => $message], $status);
}

/** Decodes the JSON request body, or fails the request with a 400. */
function clr_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $body = $raw === '' ? [] : json_decode($raw, true);
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
