import { validateNetwork } from '../l0_axioms/geometry.js';

class MinQueue {
  values = [];
  push(value) {
    const values = this.values;
    let index = values.push(value) - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (values[parent].distance <= value.distance) break;
      values[index] = values[parent]; index = parent;
    }
    values[index] = value;
  }
  pop() {
    const values = this.values, first = values[0], last = values.pop();
    if (!values.length) return first;
    let index = 0;
    while (index * 2 + 1 < values.length) {
      let child = index * 2 + 1;
      if (child + 1 < values.length && values[child + 1].distance < values[child].distance) child += 1;
      if (values[child].distance >= last.distance) break;
      values[index] = values[child]; index = child;
    }
    values[index] = last;
    return first;
  }
}

export function createPathfinder(network) {
  validateNetwork(network);
  const adjacency = new Map();
  for (const edge of network.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge);
  }
  return function shortestPath(starts, ends) {
    const targets = new Set(ends.filter(id => network.nodes[id]));
    const distances = new Map(), previous = new Map(), queue = new MinQueue();
    for (const node of starts.filter(id => network.nodes[id])) {
      distances.set(node, 0); queue.push({ node, distance: 0 });
    }
    while (queue.values.length) {
      const { node, distance } = queue.pop();
      if (distance !== distances.get(node)) continue;
      if (targets.has(node)) {
        const edges = []; let cursor = node;
        while (previous.has(cursor)) { const edge = previous.get(cursor); edges.push(edge); cursor = edge.from; }
        edges.reverse();
        return { meters: distance, edges, coordinates: [network.nodes[cursor], ...edges.map(e => network.nodes[e.to])] };
      }
      for (const edge of adjacency.get(node) || []) {
        const candidate = distance + edge.meters;
        if (candidate >= (distances.get(edge.to) ?? Infinity)) continue;
        distances.set(edge.to, candidate); previous.set(edge.to, edge);
        queue.push({ node: edge.to, distance: candidate });
      }
    }
    return null;
  };
}
