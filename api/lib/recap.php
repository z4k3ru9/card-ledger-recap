<?php

const CLR_MAX_BANKS = 50;
const CLR_MAX_ROWS_PER_BANK = 1000;
const CLR_MAX_CASH_ROWS = 1000;
// Legacy recap amounts are IDR minor units (whole rupiah), never floats.
const CLR_MAX_AMOUNT = 1000000000000;

function clr_is_list(array $value): bool
{
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

function clr_has_exact_keys(array $value, array $keys): bool
{
    $actual = array_keys($value);
    sort($actual);
    sort($keys);
    return $actual === $keys;
}

function clr_validate_month(string $month): void
{
    if (!preg_match('/^(\d{4})-(\d{2})$/', $month, $parts)) {
        clr_json_error(400, 'Invalid month - expected "YYYY-MM".', 'invalid_recap');
    }
    $monthNumber = (int) $parts[2];
    if ($monthNumber < 1 || $monthNumber > 12) {
        clr_json_error(400, 'Invalid calendar month.', 'invalid_recap');
    }
}

function clr_validate_text($value, string $field, int $maxLength, bool $allowEmpty = true): string
{
    if (!is_string($value) || (!$allowEmpty && trim($value) === '') || mb_strlen($value) > $maxLength) {
        clr_json_error(400, "Invalid $field.", 'invalid_recap');
    }
    return $value;
}

function clr_validate_id($value, array &$seenIds): string
{
    $id = clr_validate_text($value, 'row or bank id', 64, false);
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $id) || isset($seenIds[$id])) {
        clr_json_error(400, 'Recap IDs must be unique and contain only letters, numbers, underscores, or hyphens.', 'invalid_recap');
    }
    $seenIds[$id] = true;
    return $id;
}

function clr_validate_date($value): string
{
    $date = clr_validate_text($value, 'date', 10);
    if ($date === '') {
        return $date;
    }
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $parts)
        || !checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1])) {
        clr_json_error(400, 'Invalid transaction date.', 'invalid_recap');
    }
    return $date;
}

function clr_validate_amount($value): int
{
    if (!is_int($value)
        || $value < 0 || $value > CLR_MAX_AMOUNT) {
        clr_json_error(400, 'Amounts must be non-negative integer minor units within the supported range.', 'invalid_recap');
    }
    return $value;
}

function clr_validate_entry(array $row, array &$seenIds, bool $cash): array
{
    $expectedKeys = $cash
        ? ['id', 'date', 'type', 'description', 'amount']
        : ['id', 'date', 'description', 'amount'];
    if (!clr_has_exact_keys($row, $expectedKeys)) {
        clr_json_error(400, 'A recap row has missing or unknown fields.', 'invalid_recap');
    }
    $validated = [
        'id' => clr_validate_id($row['id'], $seenIds),
        'date' => clr_validate_date($row['date']),
        'description' => clr_validate_text($row['description'], 'description', 500),
        'amount' => clr_validate_amount($row['amount']),
    ];
    if ($cash) {
        if ($row['type'] !== 'deposit' && $row['type'] !== 'debit') {
            clr_json_error(400, 'Cash row type must be deposit or debit.', 'invalid_recap');
        }
        $validated = ['id' => $validated['id'], 'date' => $validated['date'], 'type' => $row['type'],
            'description' => $validated['description'], 'amount' => $validated['amount']];
    }
    return $validated;
}

/** Validate and normalize the complete persisted recap shape. */
function clr_validate_recap($recap): array
{
    if (!is_array($recap) || !clr_has_exact_keys($recap, ['banks', 'cashRows'])
        || !is_array($recap['banks']) || !clr_is_list($recap['banks'])
        || !is_array($recap['cashRows']) || !clr_is_list($recap['cashRows'])) {
        clr_json_error(400, 'Recap must contain banks and cashRows lists.', 'invalid_recap');
    }
    if (count($recap['banks']) > CLR_MAX_BANKS || count($recap['cashRows']) > CLR_MAX_CASH_ROWS) {
        clr_json_error(400, 'Recap contains too many banks or cash rows.', 'invalid_recap');
    }

    $seenIds = [];
    $banks = [];
    foreach ($recap['banks'] as $bank) {
        if (!is_array($bank) || !clr_has_exact_keys($bank, ['id', 'bankName', 'colorIndex', 'transactions'])
            || !is_int($bank['colorIndex']) || $bank['colorIndex'] < 0 || $bank['colorIndex'] > 1000
            || !is_array($bank['transactions']) || !clr_is_list($bank['transactions'])
            || count($bank['transactions']) > CLR_MAX_ROWS_PER_BANK) {
            clr_json_error(400, 'Invalid bank data.', 'invalid_recap');
        }
        $transactions = [];
        foreach ($bank['transactions'] as $row) {
            if (!is_array($row)) {
                clr_json_error(400, 'Invalid transaction row.', 'invalid_recap');
            }
            $transactions[] = clr_validate_entry($row, $seenIds, false);
        }
        $banks[] = [
            'id' => clr_validate_id($bank['id'], $seenIds),
            'bankName' => clr_validate_text($bank['bankName'], 'bank name', 100, false),
            'colorIndex' => $bank['colorIndex'],
            'transactions' => $transactions,
        ];
    }

    $cashRows = [];
    foreach ($recap['cashRows'] as $row) {
        if (!is_array($row)) {
            clr_json_error(400, 'Invalid cash row.', 'invalid_recap');
        }
        $cashRows[] = clr_validate_entry($row, $seenIds, true);
    }
    return ['banks' => $banks, 'cashRows' => $cashRows];
}
