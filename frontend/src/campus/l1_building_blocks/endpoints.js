function options(place, allowApproaches) {
  const result = [{ nodes: place.access, kind: 'mapped-access', description: place.approach }];
  if (allowApproaches && place.nearbyApproach) result.push({ nodes: [place.nearbyApproach.node],
    kind: 'nearby-approach', description: place.nearbyApproach.label });
  return result.filter(option => option.nodes.length);
}

/** Prefer exact mapped access; minimize distance only among equally precise endpoint choices. */
export function findEndpointPath(find, from, to, allowApproaches = true) {
  let best = null;
  for (const origin of options(from, allowApproaches)) for (const destination of options(to, allowApproaches)) {
    const nearbyCount = Number(origin.kind === 'nearby-approach') + Number(destination.kind === 'nearby-approach');
    if (best && nearbyCount > best.nearbyCount) continue;
    const path = find(origin.nodes, destination.nodes);
    if (!path) continue;
    if (!best || nearbyCount < best.nearbyCount || path.meters < best.path.meters) {
      best = { path, origin, destination, nearbyCount };
    }
  }
  return best;
}
