# Campus snapshot maintenance

[Feature](../../../backend/docs/features/campus-map.md) · [Data contract](../../../backend/docs/features/campus-map-data.md)

`source.json` is a reduced OpenStreetMap extract with original IDs and geometry, English names, and access/topology tags needed by this feature. It is source data for the derived database, not a handwritten campus drawing. Map data is © OpenStreetMap contributors and is available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [attribution and license information](https://www.openstreetmap.org/copyright).

From the repository root, with Node.js 24:

```sh
node frontend/scripts/campus/build.mjs
node --test tests/campus-routing.test.mjs tests/campus-transfers.test.mjs
node --test tests/campus-coverage.test.mjs
node --test tests/campus-connections.test.mjs
npm run build
```

The builder writes `frontend/src/campus/data/map.json` and `network.json` deterministically. Both include the source SHA-256, snapshot date, bounds, attribution/license and all-pairs coverage counts. Existing generated files allow normal builds without a network fetch. Rebuilding validates graph coordinates/distances, original edges, building outlines, exact boundary access and reviewed approach proximity/source-way evidence. It fails if any registered pair is unavailable.

## Refresh procedure

Do not replace the snapshot silently. Retrieve the same bounded area from Overpass, including building ways/relations, highway ways, gardens, entrances and barriers, and inspect all routing-node tags. Keep source/geometry IDs, preserve access and level information, and retain only English display names. Check closed building rings and courtyards before conversion.

Review boundary access in `frontend/src/campus/l0_axioms/places.js`. Where access is absent or disconnected, `approaches.js` may specify an existing path node within 10 meters, labeled as a nearby approach rather than an entrance. Never infer connectivity from proximity or add unverified room prefixes. Separately declared user-confirmed links in `connections.js` require explicit evidence and retain approximate-geometry warnings; see the [CYM connection contract](../../../backend/docs/features/campus-map-connections.md). Do not rewrite OSM ways to represent these reports.

Regenerate both assets, review the graph diff and run the tests above plus `npm test`. Compare representative routes with source ways and an independent shortest-path calculation, then inspect desktop/mobile map rendering and timetable navigation. Record the new source timestamp and any changed coverage in the feature documentation. Preserve ODbL attribution and applicable data-sharing requirements when distributing the derived database.
