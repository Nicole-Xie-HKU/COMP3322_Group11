import { resolveBuilding } from '../l1_building_blocks/venues.js';
import { loadPathfinder } from '../l1_building_blocks/network.js';
import { findEndpointPath } from '../l1_building_blocks/endpoints.js';

/** Includes explicitly reported connections by default; never certifies floor-level or step-free access. */
export async function findCampusRoute(fromVenue, toVenue, { allowApproaches = true, allowUserConnections = true } = {}) {
  const from = resolveBuilding(fromVenue), to = resolveBuilding(toVenue);
  const base = { from, to, geometry: null, distanceMeters: null, minutes: null, hasStairs: false, hasRoad: false };
  if (!from || !to) return { ...base, status: 'unavailable', reason: 'Unknown or unsupported venue.' };
  if (from.id === to.id) return { ...base, status: 'same-building', distanceMeters: 0, minutes: 3,
    reason: 'Same building. Allow about 3 minutes between rooms; indoor directions are not mapped.' };
  const { find, findMapped, metadata } = await loadPathfinder();
  const selected = findEndpointPath(allowUserConnections ? find : findMapped, from, to, allowApproaches);
  if (!selected) return { ...base, status: 'unavailable', reason: 'No connected mapped walking path is available.' };
  const { path, origin, destination, nearbyCount } = selected;
  const endpoints = { fromEndpoint: { ...origin, coordinate: path.coordinates[0] },
    toEndpoint: { ...destination, coordinate: path.coordinates.at(-1) }, usesNearbyApproach: nearbyCount > 0 };
  const usesUserConnection = path.edges.some(edge => edge.source === 'user-confirmed');
  // Podium buildings can share the same arrival point; a one-point LineString would be invalid GeoJSON.
  if (!path.edges.length) return { ...base, ...endpoints, status: 'shared-approach', distanceMeters: 0, minutes: 3,
    snapshot: metadata.snapshot, reason: 'These buildings share a mapped campus approach. Allow about 3 minutes and follow building/floor signs; the indoor connection is not mapped.' };
  return { ...base, ...endpoints, status: 'routed', usesUserConnection, distanceMeters: Math.round(path.meters),
    minutes: Math.max(4, Math.ceil(path.meters / 75 + 2)),
    geometry: { type: 'LineString', coordinates: path.coordinates },
    segments: path.edges.map((edge, index) => ({ ...edge, coordinates: path.coordinates.slice(index, index + 2) })),
    hasStairs: path.edges.some(edge => edge.kind === 'steps'), hasRoad: path.edges.some(edge => edge.kind === 'service'),
    snapshot: metadata.snapshot };
}
