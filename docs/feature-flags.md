# PackTally Feature Flags

## Authority and defaults

Flags are deployment configuration read by PHP at boot. They are not editable in the browser and no database row may enable a provider.

| Flag | Default | Effect when disabled |
| --- | --- | --- |
| `password_fallback_enabled` | false | Passkey-only onboarding/sign-in; no password UI. |
| `ocr_enabled` | false | Receipt upload/manual expense entry remains available. |
| `translation_enabled` | false | Original OCR text remains visible; no translation request is queued. |
| `web_push_enabled` | false | In-app notifications remain available. |
| `rate_lookup_enabled` | true | Original-currency Expense saves with `rate_pending`; settlement/report marks incomplete. |
| `pwa_enabled` | true | Static app works normally if disabled; no offline shell/queue feature is advertised. |

## Capability response

`GET /api/capabilities` returns enabled/disabled/unhealthy states. The frontend hides actions that can never work and explains temporary outages with the available fallback. It never receives provider endpoint, provider name where sensitive, API key, or deployment secret.

## Change control

Record deployment flag changes in operational audit evidence, test the enabled and disabled path, and never turn on OCR/translation before validating privacy, timeout, retry, and provider-retention behavior.
