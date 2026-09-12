# PackTally Recovery Runbook

## Lost passkey

1. Confirm the requester through the project’s out-of-band operator process.
2. Authenticate to cPanel/CLI; never use a public application route.
3. Supply the rotating recovery secret from its separate custody location.
4. Run the recovery command for the Account ID; revoke existing passkeys/sessions as the command requires and rotate the recovery secret.
5. Record operator label, target Account, time, reason, and result in a Recovery Event.
6. Have the person register a new passkey and verify normal sign-in.

## Failed migration or deployment

Stop frontend rollout, retain maintenance mode if active, inspect health/migration evidence, and restore a compatible prior static/API layer. Do not manually edit the migration ledger or reverse a data migration unless the stage-specific restore simulation has been rehearsed.

## Suspected receipt exposure

Disable receipt/OCR/translation flags, revoke affected sessions, preserve safe operational evidence, rotate compromised credentials, and assess private storage access logs. Do not copy receipt bytes into issue trackers or chat.

## Provider outage

Set provider capability unhealthy, leave original Expense/receipt/manual workflow available, stop retries after the configured bound, and expose a manual retry when service recovers.
