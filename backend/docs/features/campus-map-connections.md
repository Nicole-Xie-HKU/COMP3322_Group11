# User-confirmed CYM connections

[Feature](campus-map.md) · [Data contract](campus-map-data.md) · [Verification](../task-progress/2026-11-18-campus-connections.md)

## Basis and representation

On November 18, 2026, the user described **KK → CYM → CYCP/CYPP**, confirmed that CYM is physically next to the science buildings, and explicitly requested direct connections to remove detours. This confirms building-level connectivity, not surveyed entrances, floor levels or a detailed walking line.

The OSM snapshot already contains CYM's east entrance `6580279796` and covered footway `182208633` to Physics entrance `6580279797`. Adding that east entrance to CYM's endpoint list enables the direct Physics route without altering this mapped footway.

Three schematic, bidirectional links complete the reported connectivity:

| Declaration | Existing anchors | Purpose |
| --- | --- | --- |
| `cym-west-east` | `4525548835` → `6580279796` | KK-side CYM entrance to east walkway |
| `cym-southwest-east` | `4525548836` → `6580279796` | Other west CYM entrance to east walkway |
| `cym-cycp-plaza` | `1925517661` → `6580279801` | Covered walkway to Chemistry's existing entrance spur |

The west-to-east geometry and choice of plaza anchors are modeling approximations based on the reported building connection. They are not user-supplied turn-by-turn directions. No new coordinates, floor numbers, stair types, OSM IDs or access permissions are invented. Links terminate on existing permitted path nodes; the Chemistry entrance spur remains OSM way `700710033`.

## Data and behavior

Declarations live in `frontend/src/campus/l0_axioms/connections.js`. The L1 expander validates anchors against recorded OSM ways and rejects missing evidence, absent anchors and duplicates. It emits six directed edges with `user:` IDs, `source: user-confirmed`, report date and `approximate: true`. The original OSM source and its 5,585 edges remain unchanged; total edges become 5,591.

The generated metadata includes declarations and an overlapping `userConnectionPairs` count. Routes expose `usesUserConnection`; segments retain provenance. At the user's request, the UI presents these links as ordinary solid-green walking routes without source badges or a separate legend. The all-building coverage banner is removed. All routes say **meters estimated**; reported links still use approximate anchor-to-anchor lengths internally. Stairs, levels, closures and accessibility remain unverified. See the [presentation update](../task-progress/2026-11-18-campus-presentation.md).

`allowUserConnections: false` uses only original OSM edges. Combine it with `allowApproaches: false` to require mapped boundary endpoints. The added east CYM endpoint remains valid in this mode because it is an existing mapped entrance.

Current modeled distances: CYM→CYCP 66 m, CYM→CYPP 73 m, KK→CYCP 159 m and KK→CYPP 166 m. These are planning estimates, not measured walks. All 462 directional pairs remain supported; 96 use reported links. Replacing schematic geometry requires new route evidence and regression checks, not silent edits to the OSM snapshot.
