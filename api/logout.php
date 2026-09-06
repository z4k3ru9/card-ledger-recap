<?php
// POST /api/logout.php - ends this browser's session.
require __DIR__ . '/bootstrap.php';

clr_require_method('POST');

$_SESSION = [];
session_destroy();

clr_json(['authenticated' => false]);
