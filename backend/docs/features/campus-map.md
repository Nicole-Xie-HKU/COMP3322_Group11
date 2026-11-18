# Campus map and walking routes

[Project status](../../../TASK_PROGRESS.md) · [Data and architecture](campus-map-data.md) · [CYM connections](campus-map-connections.md)

## Use

Open **Campus Map**, enter two building names/codes or supported classroom codes, and choose **Find walking route**. For example, `MB217` to `CPD-2.37`. Swap reverses the query; Reset clears it. Click an outline or use **Explore a building** to select a start or destination. The map supports keyboard zoom and an equivalent building selector.

The weekly timetable has a **Between classes** panel. **View route** opens the relevant walk; **Back to timetable** preserves the selected schedule and displayed week. Estimates never reject, reorder, or otherwise change generated schedules, saved payloads, or calendar exports.

The map shares Build Schedule/Saved Schedules styling: gray surfaces, existing shadow tokens, pill controls, blue primary buttons and compact headings. It reuses shared button/search classes without changing the other sections. See the [style verification](../task-progress/2026-11-18-campus-style.md).

## Meaning of a route

- Solid green lines show walking routes, including the CYM connections; orange dashes identify mapped stairs. The legend does not distinguish route sources. Distance sums modeled path segments, not straight-line distance between building centers, and is labeled **meters estimated**.
- Walking time is `max(4, ceil(distanceMeters / 75 + 2))` minutes: 75 meters/minute plus a two-minute planning buffer. These are planning assumptions, not measured travel times.
- Different rooms in one building receive a three-minute estimate without an invented indoor line. An identical normalized room needs no transfer entry.
- A warning appears only when estimated minutes exceed the actual gap. Equal time is not marked tight.
- Mapped access is preferred. Where it is disconnected or absent, a reviewed **nearby approach** on an existing path is used. The UI flags the unmapped entrance/floor connection; its distance is not invented or included.
- Podium buildings can share one approach. These show a three-minute planning estimate and a shared marker, not a fabricated line. Unknown or unsupported venue names still show **Route unavailable**.

## Coverage and limits

Every pair of the 22 listed buildings is supported: 462 directional pairs, including four shared podium approaches. Of these, 110 use mapped boundary endpoints and 352 use a nearby approach. Separately, 96 pairs use at least one user-confirmed connection; endpoint precision does not imply surveyed geometry. The 13 nearby approaches are existing path nodes within 10 meters of their building outlines. Coverage does not extend to every HKU campus.

There is no step-free guarantee, lift routing, room/floor navigation, live closure check, GPS tracking, or route beyond the bundled campus area. Slopes and indoor access can add time. Use campus signs and current access information. This data has not been field-surveyed for the feature.

Only actual class occurrences inside the displayed week form transfers. Teaching-date gaps are respected. Unknown intervening venues are retained rather than skipped. Overlapping classes cannot establish an unambiguous transfer, and provisional unknown-time/date schedules receive a notice instead of false adjacency.

## Local assets

Leaflet 1.9.4, the map outlines, and the routing graph are bundled with the application. No tile provider, routing API, CDN, API key, geolocation permission, or extra database migration is needed. After application assets load, route calculation makes no external requests. The map and graph use lazy-loaded chunks; this is not an offline-installable PWA.
