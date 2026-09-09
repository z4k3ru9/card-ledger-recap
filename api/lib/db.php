<?php
// Single shared PDO connection, built from config.php (gitignored - see
// config.sample.php for the template).

function clr_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $configFile = __DIR__ . '/../config.php';
    if (!is_file($configFile)) {
        clr_json_error(
            500,
            'Missing api/config.php - copy api/config.sample.php to ' .
            'api/config.php and fill in your database credentials.',
        );
    }

    $config = require $configFile;
    if (!is_array($config)) {
        clr_json_error(500, 'api/config.php must return a configuration array.');
    }
    return $config;
}

function clr_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = clr_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_name'],
    );

    try {
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        clr_json_error(500, 'Database connection failed.');
    }

    return $pdo;
}
