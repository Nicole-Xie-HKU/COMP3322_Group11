const pedestrianKinds = new Set(['footway', 'pedestrian', 'path', 'steps']);
const denied = new Set(['no', 'private', 'customers', 'delivery', 'permit', 'use_sidepath']);
const allowed = new Set(['yes', 'designated', 'permissive', 'destination']);

export function canWalk(tags = {}) {
  if (tags.indoor === 'yes' || tags.area === 'yes' || tags.construction ||
      tags['access:conditional'] || tags['foot:conditional'] || tags.fixme ||
      (tags.conveying && !['no', 'forward', 'backward'].includes(tags.conveying)) ||
      (tags['oneway:foot'] && !['no', 'yes', '-1'].includes(tags['oneway:foot']))) return false;
  const access = tags.foot ?? tags.access;
  if (denied.has(access) || (access && !allowed.has(access))) return false;
  if (pedestrianKinds.has(tags.highway)) return true;
  // Only explicitly permitted campus service roads supplement mapped pedestrian paths.
  return tags.highway === 'service' && allowed.has(access);
}

export function isBlockedNode(tags = {}) {
  const access = tags.foot ?? tags.access;
  if ((access && !allowed.has(access)) || tags['access:conditional'] || tags['foot:conditional'] ||
      tags.locked === 'yes' || tags.highway === 'elevator') return true;
  return Boolean(tags.barrier && !['gate', 'lift_gate', 'bollard', 'cycle_barrier', 'entrance', 'kerb'].includes(tags.barrier));
}

export function walkingDirections(tags = {}) {
  if (tags['oneway:foot'] === '-1' || tags.conveying === 'backward') return ['backward'];
  if (tags['oneway:foot'] === 'yes' || tags.conveying === 'forward') return ['forward'];
  return ['forward', 'backward'];
}
