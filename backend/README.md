# Backend

Use the root [setup guide](../README.md) and [current verification](../TASK_PROGRESS.md).

- `app.js`, `server.js`, `http/`, `src/`: Express, validation, security, bounded workers and guest workflows.
- `database/`: adapters, additive schema, migrations, safe workbook import and private MySQL saves.
- `client/`: reusable JavaScript API client.
- `scripts/`: env setup, audits, contract generation, fail-closed test runner and smoke test.
- `tests/`: unit/API/contract fixtures and disposable-MySQL integration checks.

The root `.env` is shared local configuration for Docker and Node. Never include secrets in a patch or upload. Runtime database credentials have DML access only; explicit maintenance uses a separate administrator account.

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Database handoff](docs/database-handoff.md) and [schema](docs/schema.md)
- [Frontend handoff](docs/frontend-handoff.md)
- [API examples](docs/api-examples.md) and [OpenAPI](docs/openapi.json)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Upstream compatibility](docs/upstream-compatibility.md)
