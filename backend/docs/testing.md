# Verification and test commands

[Backend home](../README.md) · [Requirements](requirements.md)

```sh
npm test
npm run test:mysql
npm run check
npm run smoke
# Optional: restart only the isolated project services and verify persistence
COMPOSE_PROJECT_NAME=your-isolated-project npm run smoke -- --restart
npm audit
```

- Unit/API tests use a fake repository for HTTP isolation, actual scheduler workers, and the complete local XLSX for source reconciliation.
- Scheduling tests compare paginated search against independently enumerated fixtures, including a one-node budget. Boundaries include adjacent times, date gaps, unknown information, parent links and distinct same-time sections.
- API tests cover validation, errors, cookies, ownership, stale state, CORS, rate limits, configurable prefix and worker limits.
- `test:mysql` requires the isolated local MySQL plus maintenance credentials. It creates a unique temporary database and removes only that database. Actual queries, full imports, rollback, stable IDs, saved-data preservation and DDL denial are checked.
- Contract/client tests validate OpenAPI and the small client. `check` runs inside this Git checkout (it compares protected originals against main `5dde468`) and verifies syntax, source budgets, dependency direction/cycles, local Markdown links and protected source files.
- `smoke` requires the running backend. It creates its own guest schedule, checks it and removes that schedule; it does not clear anyone else's data.

## Evidence limits

The final verification record is linked from [project log](../../PROJECT_LOG.md). A successful mock test is not a database test. A successful HTTP test is not a browser-to-frontend test. The merged React UI was exercised through generation, pinning, MySQL saving/rename/reload and all 1,113 results across paginated responses in one real course selection; see the current evidence record. No final production VM has been tested.

The fixture course codes in unit tests are synthetic. Real-source checks use the preserved 2026–27 workbook and explicitly reconcile counts. Source data describes a static snapshot, not live seats or guaranteed registration eligibility.

No test should depend on a production root account, erase a pre-existing database or include credentials in its output. Test databases are named `hkuplanner_test_<timestamp>_<random>` and tracked by the creating test for cleanup.
