<?php
// GET /api/status.php - tells the frontend which screen to show: whether
// the shared app password has been set up yet, and whether this browser
// is currently logged in.
require __DIR__ . '/bootstrap.php';

clr_require_method('GET');

$count = (int) $clrDb->query('SELECT COUNT(*) AS c FROM auth')->fetch()['c'];

clr_json([
    'needsSetup' => $count === 0,
    'authenticated' => clr_is_authenticated(),
]);
