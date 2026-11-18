import { places } from '../l0_axioms/places.js';

export const normalizeVenue = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const exact = new Map(places.flatMap(place => [place.id, place.name, ...(place.exact || [])]
  .map(value => [normalizeVenue(value), place])));
const prefixes = places.flatMap(place => (place.prefixes || []).map(prefix => ({ prefix, place })))
  .sort((a, b) => b.prefix.length - a.prefix.length);

export function resolveBuilding(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const code = normalizeVenue(value);
  if (exact.has(code)) return exact.get(code);
  // A multi-room expression must not silently become one room after punctuation removal.
  if (/[,;&/+|]|\bor\b/i.test(value)) return null;
  for (const { prefix, place } of prefixes) {
    if (!code.startsWith(prefix)) continue;
    const suffix = code.slice(prefix.length);
    if (!suffix || /^(?:LG|UG|G|B|L)?\d+[A-Z]?$/.test(suffix)) return place;
  }
  return null;
}
