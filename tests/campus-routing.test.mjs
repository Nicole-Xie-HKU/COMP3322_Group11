import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { places, resolveVenue, findCampusRoute } from '../frontend/src/campus/public.js';
import { createPathfinder } from '../frontend/src/campus/l1_building_blocks/shortestPath.js';
import { distanceMeters, validateNetwork } from '../frontend/src/campus/l0_axioms/geometry.js';
import { canWalk, isBlockedNode, walkingDirections } from '../frontend/src/campus/l0_axioms/access.js';
import network from '../frontend/src/campus/data/network.json' with { type: 'json' };
import map from '../frontend/src/campus/data/map.json' with { type: 'json' };
import source from '../frontend/scripts/campus/source.json' with { type: 'json' };
import { confirmedConnections } from '../frontend/src/campus/l0_axioms/connections.js';
import { createConnectionEdges } from '../frontend/src/campus/l1_building_blocks/connections.js';

test('official building identities, room punctuation, aliases and exact special rooms resolve', () => {
  for (const [input, expected] of Object.entries({ 'kk-lg106': 'KK', KK101: 'KK', 'CPD-2.37': 'CPD',
    'CPD-LG.18': 'CPD', ' MB217 ': 'MB', MBG07: 'MB', MWT1: 'MW', MW325: 'MW', KB223: 'KB',
    CBA: 'CB', CBC: 'CB', CYPP3: 'CYP', CYCP1: 'CYC', CYCC501: 'CYM', WLGH: 'GH', RHT: 'RHT' })) {
    assert.equal(resolveVenue(input)?.id, expected, input);
  }
  assert.equal(resolveVenue('KB223').name, 'Knowles Building');
  assert.equal(resolveVenue('MWT1').name, 'Meng Wah Complex');
  assert.equal(resolveVenue('RHT').name, 'Rayson Huang Theatre');
  assert.equal(resolveVenue('Main Building').id, 'MB');
});

test('unsupported and composite venues never resolve by an accidental prefix', () => {
  for (const input of [null, undefined, '', 'ONLINE', 'PP', 'MBLAH', 'KBS101', 'CYT101', 'JCT101', 'RRS101',
    'MB217 / LE4', 'MB217 & LE4', 'MB217 or LE4']) {
    assert.equal(resolveVenue(input), null, String(input));
  }
});

test('unknown, same-building and strict mapped-access outcomes remain distinct', async () => {
  assert.equal((await findCampusRoute('PP', 'MB')).status, 'unavailable');
  assert.equal((await findCampusRoute('RHT', 'MB', { allowApproaches: false })).geometry, null);
  const same = await findCampusRoute('KK101', 'KKLG106');
  assert.equal(same.status, 'same-building'); assert.equal(same.minutes, 3); assert.equal(same.geometry, null);
  const disconnected = await findCampusRoute('CYPP3', 'MB217', { allowApproaches: false, allowUserConnections: false });
  assert.equal(disconnected.status, 'unavailable'); assert.equal(disconnected.minutes, null);
});

test('pedestrian access, unknown restrictions and fixed-direction escalators are honored', () => {
  assert.ok(canWalk({ highway: 'footway' }));
  assert.ok(canWalk({ highway: 'service', access: 'permissive' }));
  assert.ok(canWalk({ highway: 'footway', access: 'no', foot: 'yes' }));
  for (const tags of [{ highway: 'service' }, { highway: 'primary' }, { highway: 'footway', access: 'private' },
    { highway: 'footway', foot: 'no' }, { highway: 'footway', indoor: 'yes' },
    { highway: 'pedestrian', area: 'yes' }, { highway: 'steps', conveying: 'reversible' },
    { highway: 'steps', conveying: 'unknown' }, { highway: 'footway', 'oneway:foot': 'reversible' },
    { highway: 'footway', fixme: 'geometry' }, { highway: 'footway', 'access:conditional': 'yes @ (Mo-Fr)' }]) {
    assert.equal(canWalk(tags), false);
  }
  assert.deepEqual(walkingDirections({ conveying: 'forward' }), ['forward']);
  assert.deepEqual(walkingDirections({ conveying: 'backward' }), ['backward']);
  assert.deepEqual(walkingDirections({ 'oneway:foot': '-1' }), ['backward']);
  assert.ok(isBlockedNode({ barrier: 'gate', locked: 'yes' }));
  assert.ok(isBlockedNode({ access: 'private' }));
  assert.ok(isBlockedNode({ highway: 'elevator' }));
  assert.ok(isBlockedNode({ foot: 'unknown' }));
  assert.ok(isBlockedNode({ 'access:conditional': 'yes @ (Mo-Fr)' }));
});

function smallNetwork() {
  const nodes = { a: [114.135, 22.283], b: [114.136, 22.284], c: [114.136, 22.283],
    d: [114.137, 22.283], bridge: [114.136, 22.283] };
  const edges = [['a', 'b'], ['b', 'd'], ['a', 'c'], ['c', 'd']].map(([from, to], i) =>
    ({ id: String(i), from, to, meters: distanceMeters(nodes[from], nodes[to]) }));
  return { nodes, edges };
}

test('Dijkstra chooses the shortest directed path and does not join coincident levels', () => {
  const graph = smallNetwork(), find = createPathfinder(graph);
  assert.deepEqual(find(['a'], ['d']).edges.map(e => e.to), ['c', 'd']);
  assert.equal(find(['d'], ['a']), null);
  assert.equal(find(['bridge'], ['d']), null);
  assert.equal(find(['missing'], ['d']), null);
  assert.equal(find(['a'], ['missing']), null);
  assert.equal(find(['a'], ['a']).meters, 0);
});

test('bad coordinates, dangling edges and invalid distances fail closed', () => {
  const bad = smallNetwork(); bad.nodes.a = [NaN, 22]; assert.throws(() => validateNetwork(bad));
  for (const mutation of [e => { e.to = 'missing'; }, e => { e.meters = -1; }, e => { e.meters = 1; }]) {
    const graph = smallNetwork(); mutation(graph.edges[0]); assert.throws(() => validateNetwork(graph));
  }
});

test('every graph segment has original OSM evidence or an explicit user-confirmed declaration', () => {
  validateNetwork(network);
  const raw = readFileSync(new URL('../frontend/scripts/campus/source.json', import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), network.metadata.sourceSha256);
  const ways = new Map(source.elements.filter(e => e.type === 'way').map(e => [e.id, e]));
  const nodeTags = new Map(source.elements.filter(e => e.type === 'node').map(e => [String(e.id), e.tags]));
  const original = { ...network, edges: network.edges.filter(edge => edge.source !== 'user-confirmed') };
  const reported = createConnectionEdges(original, confirmedConnections);
  assert.deepEqual(network.metadata.confirmedConnections, confirmedConnections);
  assert.deepEqual(network.edges.filter(edge => edge.source === 'user-confirmed'), reported);
  for (const edge of network.edges) {
    assert.ok(!isBlockedNode(nodeTags.get(edge.from))); assert.ok(!isBlockedNode(nodeTags.get(edge.to)));
    if (edge.source === 'user-confirmed') { assert.ok(reported.some(expected => expected.id === edge.id)); continue; }
    const way = ways.get(edge.wayId); assert.ok(canWalk(way.tags));
    const directions = walkingDirections(way.tags);
    // Closed ways repeat their first node at the end, so indexOf cannot identify an edge position.
    assert.ok(way.nodes.slice(1).some((node, index) =>
      (String(way.nodes[index]) === edge.from && String(node) === edge.to && directions.includes('forward')) ||
      (String(way.nodes[index]) === edge.to && String(node) === edge.from && directions.includes('backward'))));
  }
  for (const place of places) {
    const outline = map.features.find(f => f.properties.osm === place.osm);
    assert.ok(outline);
    for (const access of place.access) {
      assert.ok(network.nodes[access]);
      assert.ok(outline.geometry.coordinates.flat().some(vertex =>
        vertex.every((value, i) => value === network.nodes[access][i])), `${place.id} boundary access`);
    }
  }
  assert.equal(/[\u3400-\u9fff]/u.test(JSON.stringify(map)), false);
  assert.equal(/[\u3400-\u9fff]/u.test(JSON.stringify(source)), false);
});

// Independent repeated relaxation checks the production heap implementation against the full graph.
function referenceDistance(starts, ends) {
  const distances = new Map(starts.map(id => [id, 0]));
  for (let pass = 0; pass < Object.keys(network.nodes).length - 1; pass += 1) {
    let changed = false;
    for (const edge of network.edges) {
      const next = (distances.get(edge.from) ?? Infinity) + edge.meters;
      if (next < (distances.get(edge.to) ?? Infinity)) { distances.set(edge.to, next); changed = true; }
    }
    if (!changed) break;
  }
  return Math.min(...ends.map(id => distances.get(id) ?? Infinity));
}

for (const [from, to] of [['KK', 'MB'], ['MB', 'CPD'], ['MW', 'KB'],
  ['CYM', 'CYC'], ['CYM', 'CYP'], ['KK', 'CYC'], ['KK', 'CYP']]) {
  test(`source-backed ${from}–${to} route agrees with independent shortest-path calculation`, async () => {
    for (const [a, b] of [[from, to], [to, from]]) {
      const route = await findCampusRoute(a, b); assert.equal(route.status, 'routed');
      const expected = referenceDistance(resolveVenue(a).access, resolveVenue(b).access);
      assert.equal(route.distanceMeters, Math.round(expected));
      assert.equal(route.minutes, Math.max(4, Math.ceil(expected / 75 + 2)));
      assert.equal(route.geometry.coordinates.length, route.segments.length + 1);
      assert.ok(route.distanceMeters >= distanceMeters(route.geometry.coordinates[0], route.geometry.coordinates.at(-1)) - 1);
    }
  });
}
