<?php
// Copy this file to config.php (same directory) and fill in the real
// values from cPanel's "MySQL Databases" page. config.php is gitignored -
// never commit real credentials.

return [
    // cPanel usually prefixes both the database name and the user with
    // your account username, e.g. "myuser_cardledger".
    'db_host' => 'localhost',
    'db_name' => 'cpaneluser_cardledger',
    'db_user' => 'cpaneluser_cardledger',
    'db_pass' => 'change-me',

    // Required once, when the very first password is created. Generate a
    // long random value, keep it outside version control, and remove or
    // rotate it after setup. This prevents a newly deployed public site
    // from being claimed by its first visitor.
    'setup_secret' => 'replace-with-a-long-random-secret',

    // Immutable WebAuthn identity. The RP ID is the hostname only; the
    // allowed origin includes scheme and optional non-default port.
    'webauthn_rp_id' => 'recap.example.com',
    'webauthn_allowed_origin' => 'https://recap.example.com',

    // Set true only when the hosting proxy is known to overwrite this
    // header and the origin is otherwise protected from direct access.
    'trust_forwarded_proto' => false,
];
