export const coordinate = point => [point.lon, point.lat];
export const englishName = element => element.tags?.name || '';

export function featureOf(element) {
  const tags = element.tags || {};
  let geometry;
  if (element.type === 'way' && element.geometry?.length > 1) {
    const coordinates = element.geometry.map(coordinate);
    const polygon = tags.building || tags.area === 'yes' || tags.leisure === 'garden';
    if (polygon && coordinates.length < 4) return null;
    geometry = polygon ? { type: 'Polygon', coordinates: [coordinates] } : { type: 'LineString', coordinates };
  } else if (element.type === 'relation' && tags.building) {
    const rings = (element.members || []).filter(member => member.type === 'way' && member.geometry?.length >= 4);
    // The retained Main Building relation has one closed outer ring and four closed courtyards.
    if (rings.filter(member => member.role === 'outer').length !== 1) return null;
    geometry = { type: 'Polygon', coordinates: [...rings.filter(m => m.role === 'outer'),
      ...rings.filter(m => m.role === 'inner')].map(member => member.geometry.map(coordinate)) };
  } else return null;
  return { type: 'Feature', properties: { osm: `${element.type}/${element.id}`, name: englishName(element),
    kind: tags.building ? 'building' : tags.leisure === 'garden' ? 'garden' : tags.highway }, geometry };
}
