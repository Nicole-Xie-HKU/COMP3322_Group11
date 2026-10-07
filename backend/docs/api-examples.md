# API examples and error handling

[Backend home](../README.md) · [Frontend handoff](frontend-handoff.md) · [Machine-readable contract](openapi.json)

These examples use the integrated default prefix `/api`. All successful responses are JSON; catalogue lists remain arrays, not `{data: ...}` wrappers.

```http
GET /api/courses?term=2026-27-S1&q=COMP3322
GET /api/courses/COMP3322?term=2026-27-S1
POST /api/schedules/generate
Content-Type: application/json

{"term":"2026-27-S1","courseCodes":["COMP3322","COMP3230"],"maxResults":20}
```

A generated response contains `schedules`, `total`, `returnedCount`, `searchComplete`, `totalExact`, `truncated`, `nextCursor`, and `warnings`. Each schedule has a stable selection ID, section details, `fullyVerified`, and `unknownSectionKeys`. Unknown-time sections are excluded unless the request sets `includeUnknownTimes:true`; opted-in incomplete results must be displayed as provisional, not fully verified. `credits` and `totalCredits` are null unless known, not guessed.

For continuation, repeat the same normalized input and add `cursor`. The token expires after an hour and is bound to the catalogue/import revision. Following all pages enumerates all distinct section combinations for this input; an incomplete page is not a claim that all options were found. Preference ranking applies within a page only.

```http
POST /api/schedules/conflicts
Content-Type: application/json

{"term":"2026-27-S1","sectionKeys":["COMP3322:1A","COMP3230:1A"]}
```

The server resolves section times itself. Returned conflicts identify section keys, or a section and blocked-time label. `fullyVerified:false` means selected TBA times prevent complete verification.

```http
POST /api/guest-session
Content-Type: application/json

{}
```

Keep the returned HttpOnly cookie through the browser/client; do not store it in localStorage or add it to a URL.

```http
POST /api/schedules
Content-Type: application/json

{"term":"2026-27-S1","name":"My option","sectionKeys":["COMP3322:1A"]}
```

Creation returns 201 and Location. Use `GET /api/schedules`, `GET /api/schedules/:id`, `PUT /api/schedules/:id` with `{"name":"New name"}` or changed selection fields, and `DELETE /api/schedules/:id`. Saves are limited to 100 per guest. PUT validates the resulting selection.

Errors have this shape:

```json
{"error":{"code":"INVALID_REQUEST","message":"Request validation failed.","details":[{"field":"term","message":"..."}]},"requestId":"..."}
```

400 = invalid input; 401 = absent/expired guest cookie; 403 = blocked origin; 404 = missing or not-owned resource; 409 = stale cursor/selection or save limit; 413 = body over 64 KB; 429 = rate limit; 500 = internal fault; 503 = readiness/worker/database unavailable. A valid, exhaustively checked no-solution request returns 200 with an empty list and diagnosis. Do not display raw internal errors as success.
