import { distanceMeters } from '../l0_axioms/geometry.js';

/** Expand explicit reports only; never infer connectivity from nearby coordinates. */
export function createConnectionEdges(network, connections) {
  const ids = new Set(network.edges.map(edge => edge.id));
  return connections.flatMap(connection => {
    const { id, from, to, anchorWayIds, source, reportedOn, label, evidence } = connection;
    if (!id || source !== 'user-confirmed' || !/^\d{4}-\d{2}-\d{2}$/.test(reportedOn) || !label || !evidence ||
      from === to || !network.nodes[from] || !network.nodes[to] || anchorWayIds?.length !== 2) {
      throw new Error(`Invalid confirmed connection: ${id}`);
    }
    for (const [index, node] of [from, to].entries()) {
      if (!network.edges.some(edge => edge.wayId === anchorWayIds[index] && (edge.from === node || edge.to === node))) {
        throw new Error(`Missing connection anchor evidence: ${id}/${node}`);
      }
    }
    const meters = Math.round(distanceMeters(network.nodes[from], network.nodes[to]) * 100) / 100;
    if (meters <= 0) throw new Error(`Empty confirmed connection: ${id}`);
    return [[from, to, 'forward'], [to, from, 'backward']].map(([start, end, direction]) => {
      const edgeId = `user:${id}:${direction}`;
      if (ids.has(edgeId)) throw new Error(`Duplicate confirmed connection: ${id}`);
      ids.add(edgeId);
      return { id: edgeId, from: start, to: end, meters, kind: 'connection', connectionId: id,
        source, reportedOn, label, approximate: true };
    });
  });
}
