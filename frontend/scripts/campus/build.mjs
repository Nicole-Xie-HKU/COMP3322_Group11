import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { places } from '../../src/campus/l0_axioms/places.js';
import { canWalk, isBlockedNode, walkingDirections } from '../../src/campus/l0_axioms/access.js';
import { distanceMeters, distanceToOutline, validateNetwork } from '../../src/campus/l0_axioms/geometry.js';
import { coordinate, featureOf } from './geometry.mjs';
import { createPathfinder } from '../../src/campus/l1_building_blocks/shortestPath.js';
import { findEndpointPath } from '../../src/campus/l1_building_blocks/endpoints.js';
import { confirmedConnections } from '../../src/campus/l0_axioms/connections.js';
import { createConnectionEdges } from '../../src/campus/l1_building_blocks/connections.js';

const sourceUrl = new URL('./source.json', import.meta.url);
const raw = readFileSync(sourceUrl, 'utf8');
const source = JSON.parse(raw);
const metadata = {
  version: 1, snapshot: source.osm3s.timestamp_osm_base,
  source: 'https://www.openstreetmap.org', license: 'https://opendatacommons.org/licenses/odbl/1-0/',
  attribution: '© OpenStreetMap contributors', sourceSha256: createHash('sha256').update(raw).digest('hex'),
  bounds: [114.132, 22.280, 114.142, 22.2855],
};
const network = { metadata, nodes: {}, edges: [] };
const blocked = new Set(source.elements.filter(e => e.type === 'node' && isBlockedNode(e.tags)).map(e => String(e.id)));
const features = source.elements.map(featureOf).filter(Boolean);
for (const way of source.elements.filter(e => e.type === 'way' && canWalk(e.tags))) {
  const tags = way.tags;
  for (let index = 1; index < way.nodes.length; index += 1) {
    const a = String(way.nodes[index - 1]), b = String(way.nodes[index]);
    if (a === b || blocked.has(a) || blocked.has(b)) continue;
    const start = coordinate(way.geometry[index - 1]), end = coordinate(way.geometry[index]);
    const meters = Math.round(distanceMeters(start, end) * 100) / 100;
    if (meters <= 0) continue;
    network.nodes[a] = start; network.nodes[b] = end;
    for (const direction of walkingDirections(tags)) {
      network.edges.push({ id: `${way.id}:${index}:${direction}`, from: direction === 'forward' ? a : b,
        to: direction === 'forward' ? b : a, meters, wayId: way.id, kind: tags.highway,
        ...(tags.bridge ? { bridge: tags.bridge } : {}), ...(tags.layer ? { layer: tags.layer } : {}),
        ...(tags.level ? { level: tags.level } : {}), ...(tags.covered ? { covered: tags.covered } : {}),
        ...(tags.conveying ? { conveying: tags.conveying } : {}) });
    }
  }
}
network.edges.push(...createConnectionEdges(network, confirmedConnections));
metadata.confirmedConnections = confirmedConnections;
validateNetwork(network);
for (const place of places) {
  const outline = features.find(feature => feature.properties.osm === place.osm);
  if (!outline || outline.geometry.type !== 'Polygon') throw new Error(`Missing outline: ${place.id}`);
  for (const node of place.access) {
    const point = network.nodes[node];
    if (!point) throw new Error(`Missing access node: ${place.id}/${node}`);
    // Access must reach the actual building boundary, not a nearby point across a wall or road.
    if (!outline.geometry.coordinates.flat().some(vertex => vertex.every((value, i) => value === point[i]))) {
      throw new Error(`Access node is not on the building outline: ${place.id}/${node}`);
    }
  }
  const approach = place.nearbyApproach;
  if (approach) {
    if (!network.nodes[approach.node] || distanceToOutline(network.nodes[approach.node], outline.geometry) > 10) {
      throw new Error(`Approach is missing or too far from the building: ${place.id}`);
    }
    for (const wayId of approach.wayIds) if (!network.edges.some(edge => edge.wayId === wayId &&
      (edge.from === approach.node || edge.to === approach.node))) throw new Error(`Missing approach path evidence: ${place.id}/${wayId}`);
  }
}
const find = createPathfinder(network);
const coverage = { buildings: places.length, directionalPairs: 0, mappedAccessPairs: 0, nearbyApproachPairs: 0,
  sharedApproachPairs: 0, unavailablePairs: 0, userConnectionPairs: 0 };
for (const from of places) for (const to of places) {
  if (from.id === to.id) continue;
  coverage.directionalPairs += 1;
  const selected = findEndpointPath(find, from, to);
  if (!selected) { coverage.unavailablePairs += 1; continue; }
  if (selected.nearbyCount) coverage.nearbyApproachPairs += 1;
  else coverage.mappedAccessPairs += 1;
  if (!selected.path.edges.length) coverage.sharedApproachPairs += 1;
  if (selected.path.edges.some(edge => edge.source === 'user-confirmed')) coverage.userConnectionPairs += 1;
}
if (coverage.unavailablePairs) throw new Error(`Campus coverage has ${coverage.unavailablePairs} unavailable building pairs.`);
metadata.coverage = coverage;
const output = new URL('../../src/campus/data/', import.meta.url);
writeFileSync(new URL('network.json', output), JSON.stringify(network) + '\n');
writeFileSync(new URL('map.json', output), JSON.stringify({ type: 'FeatureCollection', metadata, features }) + '\n');
console.log(JSON.stringify({ features: features.length, nodes: Object.keys(network.nodes).length,
  directedEdges: network.edges.length, places: places.length, snapshot: metadata.snapshot, coverage }));
