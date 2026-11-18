import { createPathfinder } from './shortestPath.js';

let pending;
export function loadPathfinder() {
  if (!pending) pending = import('../data/network.json', { with: { type: 'json' } })
    .then(({ default: network }) => ({ find: createPathfinder(network), metadata: network.metadata,
      findMapped: createPathfinder({ ...network, edges: network.edges.filter(edge => edge.source !== 'user-confirmed') }) }))
    .catch(error => { pending = undefined; throw error; });
  return pending;
}
