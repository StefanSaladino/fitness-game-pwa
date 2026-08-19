# Phase 5.7 validation hotfix

Apply these files over the existing v0.3.6 tree.

Fixes:
- Preserves the `MEMBER` literal in `groupHooks.test.tsx` so TypeScript accepts the `GroupSummary` mock.
- Adds a dedicated `vitest.integration.config.ts` that discovers `tests/integration/**`.
- Routes `npm run test:integration` through that config.
- Includes the integration Vitest config in Node-side TypeScript config.
- Adds structural regression assertions for both issues.

No production behavior, database schema, scoring rules, or UI is changed.

Run:

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

Expected structural/internal counts after this hotfix:
- structural: 536 assertions
- internal lifting-v1: 62 assertions
