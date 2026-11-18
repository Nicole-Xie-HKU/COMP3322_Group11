import test from 'node:test';
import assert from 'node:assert/strict';
import { places, findCampusRoute, getWeeklyTransfers } from '../frontend/src/campus/public.js';
import { distanceToOutline } from '../frontend/src/campus/l0_axioms/geometry.js';
import { findEndpointPath } from '../frontend/src/campus/l1_building_blocks/endpoints.js';
import network from '../frontend/src/campus/data/network.json' with { type: 'json' };
import map from '../frontend/src/campus/data/map.json' with { type: 'json' };

test('every listed building pair has mapped routing or an explicit shared approach', async () => {
  const counts = { buildings: places.length, directionalPairs: 0, mappedAccessPairs: 0,
    nearbyApproachPairs: 0, sharedApproachPairs: 0, unavailablePairs: 0, userConnectionPairs: 0 };
  for (const from of places) for (const to of places) {
    const route = await findCampusRoute(from.id, to.id);
    if (from.id === to.id) { assert.equal(route.status, 'same-building'); continue; }
    counts.directionalPairs += 1;
    assert.ok(['routed', 'shared-approach'].includes(route.status), `${from.id} -> ${to.id}`);
    assert.ok(Number.isFinite(route.minutes) && route.minutes > 0);
    if (route.usesNearbyApproach) counts.nearbyApproachPairs += 1;
    else counts.mappedAccessPairs += 1;
    if (route.usesUserConnection) counts.userConnectionPairs += 1;
    if (route.status === 'shared-approach') {
      counts.sharedApproachPairs += 1;
      assert.equal(route.geometry, null);
      assert.deepEqual(route.fromEndpoint.coordinate, route.toEndpoint.coordinate);
    } else {
      assert.ok(route.geometry.coordinates.length >= 2);
      assert.deepEqual(route.geometry.coordinates[0], route.fromEndpoint.coordinate);
      assert.deepEqual(route.geometry.coordinates.at(-1), route.toEndpoint.coordinate);
      assert.equal(route.geometry.coordinates.length, route.segments.length + 1);
      for (const segment of route.segments) assert.ok(network.edges.some(edge => edge.id === segment.id));
    }
  }
  assert.equal(counts.directionalPairs, places.length * (places.length - 1));
  assert.deepEqual(counts, network.metadata.coverage);
  assert.deepEqual(counts, map.metadata.coverage);
});

test('nearby approaches are reviewed existing path nodes within ten meters of their building', () => {
  for (const place of places.filter(place => place.nearbyApproach)) {
    const approach = place.nearbyApproach, point = network.nodes[approach.node];
    const outline = map.features.find(feature => feature.properties.osm === place.osm);
    assert.ok(approach.label.length > 20);
    assert.ok(distanceToOutline(point, outline.geometry) <= 10, place.id);
    for (const wayId of approach.wayIds) assert.ok(network.edges.some(edge => edge.wayId === wayId &&
      (edge.from === approach.node || edge.to === approach.node)), `${place.id}: ${wayId}`);
  }
  assert.equal(distanceToOutline([0, 0], { type: 'LineString' }), Infinity);
  assert.equal(distanceToOutline([NaN, 0], { type: 'Polygon' }), Infinity);
});

const endpointPlace = (node, nearby) => ({ access: [node], approach: 'Mapped entrance',
  nearbyApproach: { node: nearby, label: 'Nearby public path' } });
test('mapped access is preferred over a shorter nearby-approach alternative', () => {
  const from = endpointPlace('a', 'p'), to = endpointPlace('b', 'q');
  const distances = { ab: 100, aq: 20, pb: 15, pq: 1 };
  const find = (a, b) => ({ meters: distances[a[0] + b[0]] });
  const selected = findEndpointPath(find, from, to);
  assert.equal(selected.path.meters, 100); assert.equal(selected.nearbyCount, 0);
});

test('fallback chooses the shortest equally precise approach and never invents connectivity', () => {
  const from = endpointPlace('a', 'p'), to = endpointPlace('b', 'q');
  const distances = { aq: 20, pb: 15, pq: 1 };
  const find = (a, b) => distances[a[0] + b[0]] ? { meters: distances[a[0] + b[0]] } : null;
  const selected = findEndpointPath(find, from, to);
  assert.equal(selected.path.meters, 15); assert.equal(selected.nearbyCount, 1);
  assert.equal(findEndpointPath(find, from, to, false), null);
  assert.equal(findEndpointPath(() => null, from, to), null);
});

test('shared podium approaches never produce a one-point route line', async () => {
  for (const [from, to] of [['CPD', 'CYT'], ['CYT', 'CPD'], ['CPD', 'JCT'], ['JCT', 'CPD']]) {
    const route = await findCampusRoute(from, to);
    assert.equal(route.status, 'shared-approach'); assert.equal(route.geometry, null);
    assert.equal(route.distanceMeters, 0); assert.equal(route.minutes, 3);
    assert.ok(route.usesNearbyApproach); assert.match(route.reason, /indoor connection is not mapped/);
  }
});

test('newly supported timetable transfers retain approach uncertainty and tight-gap warnings', async () => {
  const range = { startDate: '2026-09-07', endDate: '2026-09-11' };
  const schedule = { sections: [['A', 'RHT', 600, 650], ['B', 'CYPP3', 650, 710]].map(([courseCode, venue, start, end]) =>
    ({ courseCode, id: '1A', tba: [], meetings: [{ day: 1, venue, start, end, ...range }] })) };
  const { transfers } = await getWeeklyTransfers(schedule, range);
  assert.equal(transfers.length, 1); assert.equal(transfers[0].route.status, 'routed');
  assert.ok(transfers[0].route.usesNearbyApproach); assert.ok(transfers[0].tight);
  assert.equal(transfers[0].route.fromEndpoint.kind, 'nearby-approach');
  assert.equal(transfers[0].route.toEndpoint.kind, 'mapped-access');
  assert.ok(transfers[0].route.usesUserConnection);
});
