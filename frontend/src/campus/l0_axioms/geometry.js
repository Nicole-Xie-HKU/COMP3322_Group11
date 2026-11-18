/** Coordinates use GeoJSON order: longitude, latitude. Distances are meters. */
export function distanceMeters(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitude = radians(b[1] - a[1]);
  const longitude = radians(b[0] - a[0]);
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a[1])) *
    Math.cos(radians(b[1])) * Math.sin(longitude / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function validCoordinate(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

/** Short-range distance to a footprint edge; proximity validates an approach, never creates a path. */
export function distanceToOutline(point, geometry) {
  if (!validCoordinate(point) || geometry?.type !== 'Polygon') return Infinity;
  let nearest = Infinity;
  const longitudeScale = Math.cos(point[1] * Math.PI / 180);
  for (const ring of geometry.coordinates) for (let index = 1; index < ring.length; index += 1) {
    const a = ring[index - 1], b = ring[index];
    const dx = (b[0] - a[0]) * longitudeScale, dy = b[1] - a[1];
    const x = (point[0] - a[0]) * longitudeScale, y = point[1] - a[1];
    const fraction = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy || 1)));
    const projected = [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])];
    nearest = Math.min(nearest, distanceMeters(point, projected));
  }
  return nearest;
}

export function validateNetwork(network) {
  if (!network?.nodes || !Array.isArray(network.edges)) throw new Error('Invalid campus network.');
  for (const coordinate of Object.values(network.nodes)) {
    if (!validCoordinate(coordinate)) throw new Error('Invalid campus coordinate.');
  }
  const ids = new Set();
  for (const edge of network.edges) {
    if (!edge.id || ids.has(edge.id)) throw new Error('Duplicate or missing path identifier.');
    ids.add(edge.id);
    if (!network.nodes[edge.from] || !network.nodes[edge.to] || edge.from === edge.to ||
      !Number.isFinite(edge.meters) || edge.meters <= 0) throw new Error('Invalid campus path.');
    const measured = distanceMeters(network.nodes[edge.from], network.nodes[edge.to]);
    if (Math.abs(measured - edge.meters) > 0.1) throw new Error('Campus path distance mismatch.');
  }
  return network;
}
