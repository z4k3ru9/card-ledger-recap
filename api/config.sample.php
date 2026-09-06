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
];
