# Backend

This is the single backend-owned package. Use the root [setup guide](../README.md) and [progress log](../TASK_PROGRESS.md).

- `app.js`, `server.js`, `http/`, `src/`: Express, validation, security, worker integration and guest workflows.
- `database/`: adapters, additive schema, migrations, safe workbook import and private MySQL saves.
- `tests/`: backend/API/import/security regression tests.
- `docs/`: [frontend handoff](docs/frontend-handoff.md), [database handoff](docs/database-handoff.md), [architecture](docs/architecture.md), [OpenAPI](docs/openapi.json).
- `client/`: reusable JavaScript API client.
- `scripts/`: env setup, audits, contract generation and smoke test.
- `package.json` / `package-lock.json`: backend-only dependencies.

Existing root `Database/` is unchanged and supplies the core schema/workbook. The root `scheduler/` remains the team's shared scheduling authority, also used by the frontend. Do not upload this folder alone: the documented root/frontend/shared-scheduler updates wire it into the current app. No frontend replacement is supplied.

From the repository root, `npm run setup` installs both packages. Use `npm run dev:api` for this server and `npm run dev` for Vite. The root `.env` remains the shared local configuration for Docker and Node; do not put secrets in an upload.
