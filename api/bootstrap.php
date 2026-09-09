<?php
// Included by every endpoint: a PHP version guard, JSON helpers, the DB
// connection, and a MySQL-backed session already started.

// This intentionally uses only syntax that has worked since PHP 5, so it
// can run - and fail loudly with a real JSON message - even on a host
// whose PHP is too old to parse the rest of this codebase (which needs
// 8.0+, for union return types in lib/SessionHandler.php). Without this
// guard, an incompatible host would show a blank, unhelpful 500 instead:
// PHP fails to parse a required file only once execution reaches that
// require, so this check runs and reports the real problem first.
if (version_compare(PHP_VERSION, '8.0.0', '<')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'error' => 'This app requires PHP 8.0 or newer (found ' . PHP_VERSION . '). '
            . 'On cPanel, switch the domain to a newer PHP version in "MultiPHP Manager", then reload.',
    ));
    exit;
}

// Don't let a stray notice/warning get printed into the response body -
// that would corrupt the JSON every endpoint returns. Still log errors
// server-side so they're not silently lost.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$clrRequestId = bin2hex(random_bytes(8));
header('X-Request-ID: ' . $clrRequestId);

// Turn any otherwise-uncaught error/exception into a JSON 500 instead of
// PHP's default HTML error page (which the frontend can't parse as JSON
// and would just report as a bare "Request failed (500)").
set_exception_handler(function (Throwable $e) use ($clrRequestId) {
    error_log(json_encode([
        'event' => 'unhandled_exception',
        'request_id' => $clrRequestId,
        'path' => $_SERVER['REQUEST_URI'] ?? '',
        'exception' => (string) $e,
    ]));
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unexpected server error.']);
    exit;
});
set_error_handler(function (int $severity, string $message, string $file, int $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/SessionHandler.php';

$clrDb = clr_db();
clr_start_session($clrDb);
