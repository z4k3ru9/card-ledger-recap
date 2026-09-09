<?php
require_once __DIR__ . '/../vendor/autoload.php';

use lbuchs\WebAuthn\WebAuthn;

function clr_webauthn_config(): array
{
    $config = clr_config();
    $rpId = trim((string) ($config['webauthn_rp_id'] ?? ''));
    $origin = rtrim(trim((string) ($config['webauthn_allowed_origin'] ?? '')), '/');
    if ($rpId === '' || $origin === '') {
        clr_json_error(503, 'WebAuthn is not configured on this server.');
    }
    return ['rp_id' => $rpId, 'origin' => $origin];
}

/** Reject WebAuthn ceremonies from any origin not fixed in server config. */
function clr_require_webauthn_origin(): void
{
    $expected = clr_webauthn_config()['origin'];
    $actual = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($actual === '' || !hash_equals($expected, $actual)) {
        clr_json_error(403, 'This origin is not allowed to use passkeys.');
    }
}

function clr_webauthn(): WebAuthn
{
    static $webAuthn = null;
    if ($webAuthn !== null) {
        return $webAuthn;
    }
    // 'none' attestation only - this app only needs to know the same
    // device that registered is the one logging back in, not which exact
    // authenticator model it is. Per the library's own docs: "this is
    // probably what you want to use if you want secure login for a
    // public website." The final `true` switches JSON output to plain
    // base64url strings (matches what the frontend expects).
    $webAuthn = new WebAuthn(
        'Card Ledger Recap',
        clr_webauthn_config()['rp_id'],
        ['none'],
        true,
    );
    return $webAuthn;
}

function clr_base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function clr_base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * The shared account's WebAuthn user handle - one value for the whole app
 * (not per-person), since every registered passkey unlocks the same
 * shared login. Generated once, on first use.
 */
function clr_webauthn_user_id(PDO $db): string
{
    $row = $db->query('SELECT webauthn_user_id FROM auth WHERE id = 1')->fetch();
    if ($row && $row['webauthn_user_id'] !== null) {
        return $row['webauthn_user_id'];
    }
    $userId = random_bytes(32);
    $stmt = $db->prepare('UPDATE auth SET webauthn_user_id = :id WHERE id = 1');
    $stmt->execute([':id' => $userId]);
    return $userId;
}

function clr_passkey_count(PDO $db): int
{
    return (int) $db->query('SELECT COUNT(*) AS c FROM webauthn_credentials')->fetch()['c'];
}
