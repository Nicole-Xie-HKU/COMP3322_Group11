# Database teammate handoff

[Home](../README.md) · [ER diagram](schema.md) · [Changes](upstream-compatibility.md)

## What stays intact

`Database/schema.sql`, original XLSX, JSON and R converter are byte-identical to main `5dde468`. The four existing tables retain their columns and relationships. No table/column is dropped or altered by the additive migration.

`backend/database/backend-schema.sql` adds guest sessions, saved selections, import revisions, term metadata and sidecar enrichment tables. `backend/database/migrate.js` records a checksum in `backend_migrations`. It accepts fresh or merged-main databases, but refuses the older local v2-derived schema. Do not point this checkout at the original backend's volume.

## Safe setup and updates

Back up existing data first. From root: create/review `.env`, then run `docker compose up -d mysql`, `docker compose run --build --rm setup`, and `docker compose up --build -d app`. Setup runs schema creation with admin credentials, limits the dedicated runtime account to DML, then imports the workbook. It never resets a volume. Keep DB_PASSWORD/MYSQL_ROOT_PASSWORD equal to the existing volume's credentials when upgrading.

For subsequent source updates: `npm run db:import` (Node 24 with admin env) or `docker compose run --rm setup`. The importer parses and validates the entire workbook before writing. All catalogue DML uses one transaction; DDL is separate because MySQL commits DDL implicitly. A failed import rolls back catalogue changes, not earlier schema creation.

Existing section IDs are preserved by term/course/section identity. Existing class-number links remain intact. Reused/changed class numbers or duplicate natural identities cause an explicit failure requiring your reconciliation; the importer does not guess or reassign them. Missing sections are marked inactive in the sidecar rather than deleted. Saved selections survive imports and reconstruct against current data; invalidated selections return 409.

## Shared contracts

Use `backend/database/public.js` for backend reads/writes. Public DTOs use weekdays 1–7, minute offsets, inclusive date-only meeting ranges, section keys `COURSE:SECTION`, nullable unknown fields and a `tba` array. SQL retains main's `term`, string weekday and TIME columns. Queries join by **class_number AND term**, never class number alone, within a repeatable-read snapshot.

Use `backend_course_metadata` for verified credits; `backend_section_metadata` for verified type/parent/campus/seats/waitlist information. Imports preserve enrichment. Default type is CLASS, not invented lecture/tutorial labels. Unknown seats are not available seats.

The entire original Database folder is unchanged, including its legacy commands. Do not use those old commands for this integrated service: root npm/Compose now calls backend/database. The original JSON, R and legacy database server remain available as teammate source history. The workbook importer is the supported path.

## Source anomaly found during UI testing

RECO3039:1A contains a Wednesday 11:00–12:50 KB526 range through November 25 plus a November 4 MB201 row at the same time. The source does not explicitly label this as a room override. The scheduler excludes internally overlapping sections with a visible source-data warning; please verify overrides rather than merging/guessing them. Other RECO3039 sections show the same pattern. This is a source-enrichment task, not missing HTTP wiring.
