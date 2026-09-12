# Release gates

Run these checks from the repository root before merging or deploying:

```text
npm run check:packtally-contract
npm test
npm run lint
npm run build
npm run test:php
```

The contract check is a cutover guardrail. It compares every path in `docs/packtally/openapi.yaml` with `docs/packtally/route-inventory.json`. Routes marked `design-only` are intentionally not shipped; they must not be presented as available behavior. A route can move to `implemented` only when its handler, persistence, authorization, idempotency behavior, and integration tests are present.

The current tests simulate the high-risk legacy flows:

- bounded retry and permanent save failure;
- disposal and stale request generations;
- rapid month switching without stale replacement;
- integer money validation and overflow boundaries;
- idempotent mutation replay and revision conflicts at the API boundary.

The following remain release gates for the future normalized PackTally implementation: migration/rollback, multi-session permission checks, WebAuthn browser flows, offline replay, receipt processing, PDF pagination, backup restore, and mobile accessibility at narrow viewports.
