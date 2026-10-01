# Backend

This is the backend package. Use the root [setup guide](../README.md) and [progress log](../TASK_PROGRESS.md).

- `app.js`, `server.js`, `http/`, `src/`: Express, validation, security, worker integration and guest workflows.
- `database/`: adapters, additive schema, migrations, safe workbook import and private MySQL saves
- `client/`: reusable JavaScript API client.
- `scripts/`: env setup, audits, contract generation and smoke test.
- `package.json` / `package-lock.json`: backend-only dependencies.


From the repository root, `npm run setup` installs both packages. Use `npm run dev:api` for this server and `npm run dev` for Vite. The root `.env` remains the shared local configuration for Docker and Node; do not put secrets in an upload.
