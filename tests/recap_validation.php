<?php

function clr_json_error(int $status, string $message, ?string $code = null)
{
    throw new InvalidArgumentException($message, $status);
}

require __DIR__ . '/../api/lib/recap.php';

function expect_invalid(array $recap, string $label): void
{
    try {
        clr_validate_recap($recap);
    } catch (InvalidArgumentException $e) {
        return;
    }
    throw new RuntimeException("Expected invalid recap: $label");
}

$valid = [
    'banks' => [[
        'id' => 'bank-1',
        'bankName' => 'Example Bank',
        'colorIndex' => 0,
        'transactions' => [[
            'id' => 'transaction-1',
            'date' => '2026-09-08',
            'description' => 'Groceries',
            'amount' => 125000,
        ]],
    ]],
    'cashRows' => [[
        'id' => 'cash-1',
        'date' => '',
        'type' => 'deposit',
        'description' => '',
        'amount' => 0,
    ]],
];

if (clr_validate_recap($valid) !== $valid) {
    throw new RuntimeException('Valid recap was not preserved.');
}

$invalidAmount = $valid;
$invalidAmount['banks'][0]['transactions'][0]['amount'] = -1;
expect_invalid($invalidAmount, 'negative amount');

$duplicateId = $valid;
$duplicateId['cashRows'][0]['id'] = 'transaction-1';
expect_invalid($duplicateId, 'duplicate id');

$unknownField = $valid;
$unknownField['cashRows'][0]['unexpected'] = true;
expect_invalid($unknownField, 'unknown field');

echo "recap validation tests passed\n";
