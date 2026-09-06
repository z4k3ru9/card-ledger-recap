<?php
// Included by every endpoint: JSON helpers, the DB connection, and a
// MySQL-backed session already started.

require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/SessionHandler.php';

$clrDb = clr_db();
clr_start_session($clrDb);
