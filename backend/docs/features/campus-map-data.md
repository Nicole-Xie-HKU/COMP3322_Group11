# Campus map data and architecture

[Feature](campus-map.md) · [CYM connections](campus-map-connections.md) · [Rebuild](../../../frontend/scripts/campus/README.md)

## Sources

Geometry and topology are derived from OpenStreetMap, snapshot `2026-11-18T07:42:09Z`, bounded by longitude 114.132–114.142 and latitude 22.2800–22.2855. Map attribution remains visible: [OpenStreetMap contributors / ODbL](https://www.openstreetmap.org/copyright). The sanitized source and derived database retain that attribution and the license URL. Leaflet retains its packaged license.

Building/classroom identities were checked against [HKU course enrollment](https://aas.hku.hk/course-enrollment/) and [examination venue abbreviations](https://exam.hku.hk/C_2.htm), with the [HKU map](https://www.maps.hku.hk/) as campus context. KB means Knowles Building, MW/MWT means Meng Wah, and RHT means Rayson Huang Theatre. CBA/CBC resolve to Chow Yei Ching, CYCP to Chemistry, CYPP to Physics, and CYCC to the Cultural Centre. The supplied transit prototype is reference material, not authoritative topology or aliases.

`KBS`, `CYT`, `JCT` and `RRS` are selectable map identifiers, not inferred classroom prefixes. Unverified prefix-plus-room combinations are rejected. Composite venue strings are not silently reduced to a single room. All newly displayed names and documentation are English; original upstream branding is unchanged.

## Ownership

All paths below are relative to `frontend/src/campus/`:

- `l0_axioms/`: canonical places, pedestrian access rules, coordinate and graph invariants.
- `l1_building_blocks/`: strict venue resolution, heap-based Dijkstra, lazy graph loading, and date-only occurrence expansion.
- `l2_workflows/`: `findCampusRoute` and `getWeeklyTransfers`.
- `public.js`: the campus module facade. Planner integration uses it through the campus UI; existing scheduler and backend internals are unchanged.
- `components/`: map and transfer presentation. `CampusMapView` is the application's lazy-loading/error boundary.

UI orchestration keeps the planner mounted while hidden so navigation does not reset its week or result. Requests ignore stale asynchronous completions; missing chunks show retry/error states instead of fabricated paths.

## Graph contract

GeoJSON uses `[longitude, latitude]`; Leaflet converts at rendering. OSM edges retain original way/node IDs and lengths. Shared IDs connect paths; proximity or level crossings never create implicit links. Explicit user-confirmed connections retain separate provenance and approximate geometry. Exact access nodes must lie on the building outline. Nearby approaches must belong to documented source ways within 10 meters; proximity never creates an edge.

Routes prefer exact access over a nearby approach, then minimize modeled meters. Shared podium endpoints yield a marker, not invalid one-point GeoJSON. `allowApproaches: false` requires boundary endpoints; `allowUserConnections: false` excludes reported edges. The builder fails on unavailable pairs and records endpoint coverage plus the overlapping count of routes using user-confirmed connections.

The OSM import excludes private/unknown/conditional access, indoor paths, area polygons, construction, uncertain geometry, elevators and unspecified/reversible escalators. Fixed directions are respected. Reported links do not relax import rules or assert accessibility; their straight anchor distances are approximate planning costs, not measured traversals.

## Size exceptions

The retained OSM JSON and generated GeoJSON/network are declarative data, not hand-maintained source; compact JSON avoids arbitrary partitioning. Every new executable file is below 200 lines. Existing `App.jsx` grows from 247 to 254 lines for route navigation and mounted planner state; its pre-existing size issue is deliberately not mixed with a broad root-component refactor. Existing CSS budget and protected-source issues remain reported, not suppressed.
