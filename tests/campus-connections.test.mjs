import test from 'node:test';
import assert from 'node:assert/strict';
import { findCampusRoute, getWeeklyTransfers } from '../frontend/src/campus/public.js';
import { confirmedConnections } from '../frontend/src/campus/l0_axioms/connections.js';
import { createConnectionEdges } from '../frontend/src/campus/l1_building_blocks/connections.js';
import { distanceMeters } from '../frontend/src/campus/l0_axioms/geometry.js';
import network from '../frontend/src/campus/data/network.json' with { type: 'json' };

const original = { ...network, edges: network.edges.filter(edge => edge.source !== 'user-confirmed') };

test('reported connections retain provenance, approximate lengths and both walking directions', () => {
  const edges = createConnectionEdges(original, confirmedConnections);
  assert.equal(edges.length, confirmedConnections.length * 2);
  for (const connection of confirmedConnections) {
    for (const [from, to] of [[connection.from, connection.to], [connection.to, connection.from]]) {
      const edge = edges.find(item => item.connectionId === connection.id && item.from === from && item.to === to);
      assert.ok(edge); assert.equal(edge.approximate, true); assert.equal(edge.source, 'user-confirmed');
      assert.equal(edge.reportedOn, connection.reportedOn); assert.equal(edge.wayId, undefined);
      assert.equal(edge.meters, Math.round(distanceMeters(network.nodes[from], network.nodes[to]) * 100) / 100);
    }
  }
  assert.ok(original.edges.every(edge => !edge.connectionId), 'The original graph is not mutated');
});

test('unknown anchors, missing provenance, wrong source ways and duplicate declarations fail closed', () => {
  const connection = confirmedConnections[0];
  for (const changes of [{ from: 'missing' }, { to: connection.from }, { source: 'osm' },
    { reportedOn: '' }, { evidence: '' }, { anchorWayIds: [] }, { anchorWayIds: [0, 0] }]) {
    assert.throws(() => createConnectionEdges(original, [{ ...connection, ...changes }]));
  }
  assert.throws(() => createConnectionEdges(original, [connection, connection]), /Duplicate/);
  assert.throws(() => createConnectionEdges(network, [connection]), /Duplicate/);
  assert.deepEqual(createConnectionEdges(original, []), []);
});

test('CYM uses its mapped east exit to reach both science buildings directly, in both directions', async () => {
  for (const science of ['CYCP', 'CYPP']) for (const reverse of [false, true]) {
    const route = await findCampusRoute(...(reverse ? [science, 'CYM'] : ['CYM', science]));
    assert.equal(route.status, 'routed'); assert.equal(route.usesNearbyApproach, false);
    assert.equal(route.hasRoad, false); assert.ok(route.distanceMeters < 100);
    const endpoint = reverse ? route.toEndpoint : route.fromEndpoint;
    assert.deepEqual(endpoint.coordinate, network.nodes['6580279796']);
    assert.ok(route.segments.some(edge => edge.wayId === 182208633));
    assert.equal(route.usesUserConnection, science === 'CYCP');
    if (science === 'CYCP') assert.ok(route.segments.some(edge => edge.connectionId === 'cym-cycp-plaza'));
  }
});

test('KK reaches CYCP/CYPP through CYM instead of the service-road detour, in both directions', async () => {
  for (const science of ['CYCP', 'CYPP']) for (const reverse of [false, true]) {
    const pair = reverse ? [science, 'KK'] : ['KK', science];
    const route = await findCampusRoute(...pair);
    const mappedOnly = await findCampusRoute(...pair, { allowUserConnections: false });
    assert.ok(route.usesUserConnection); assert.equal(route.usesNearbyApproach, false);
    assert.equal(route.hasRoad, false); assert.ok(route.distanceMeters < mappedOnly.distanceMeters / 2);
    assert.ok(route.segments.some(edge => edge.wayId === 182203615));
    assert.ok(route.segments.some(edge => edge.connectionId === 'cym-west-east'));
    assert.equal(mappedOnly.usesUserConnection, false);
    assert.ok(mappedOnly.segments.every(edge => !edge.connectionId));
  }
});

test('both mapped west entrances connect to the east exit without changing strict OSM behavior', async () => {
  const route = await findCampusRoute('RHT', 'CYPP3');
  assert.ok(route.segments.some(edge => edge.connectionId === 'cym-southwest-east'));
  const strict = { allowApproaches: false, allowUserConnections: false };
  assert.equal((await findCampusRoute('KK', 'CYCP', strict)).status, 'unavailable');
  assert.equal((await findCampusRoute('CYM', 'CYPP', strict)).status, 'routed');
  assert.equal((await findCampusRoute('UNKNOWN', 'CYCP')).status, 'unavailable');
  assert.equal((await findCampusRoute('CYM', 'CYCC501')).status, 'same-building');
});

test('timetable transfers use the direct connection and preserve its uncertainty', async () => {
  const range = { startDate: '2026-09-07', endDate: '2026-09-11' };
  const schedule = { sections: [['A', 'KK101', 600, 650], ['B', 'CYCP1', 655, 710]].map(([courseCode, venue, start, end]) =>
    ({ courseCode, id: '1A', tba: [], meetings: [{ day: 1, venue, start, end, ...range }] })) };
  const { transfers } = await getWeeklyTransfers(schedule, range);
  assert.equal(transfers.length, 1); assert.ok(transfers[0].route.usesUserConnection);
  assert.equal(transfers[0].route.usesNearbyApproach, false);
  assert.equal(transfers[0].tight, transfers[0].route.minutes > transfers[0].gap);
  assert.ok(transfers[0].route.segments.some(edge => edge.approximate));
});
