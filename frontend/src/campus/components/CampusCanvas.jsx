import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapFeatures from '../data/map.json';
import { places } from '../public.js';

const campusBounds = [[22.2817, 114.1333], [22.28455, 114.1404]];
const byOsm = new Map(places.map(place => [place.osm, place]));
const style = feature => {
  const kind = feature.properties.kind;
  if (kind === 'building') return { color: '#a7acaa', weight: 1, fillColor: '#e2e4dc', fillOpacity: 0.95 };
  if (kind === 'garden') return { color: '#c2d6c0', weight: 1, fillColor: '#d9e8d1', fillOpacity: 0.85 };
  if (['footway', 'pedestrian', 'steps', 'path'].includes(kind)) return { color: '#c4b8a6', weight: 2, opacity: 0.65 };
  return { color: '#c5cecf', weight: 4, opacity: 0.75 };
};
const labelNode = text => { const element = document.createElement('span'); element.textContent = text; return element; };

export default function CampusCanvas({ route, selectedPlace, onSelect, fitRequest }) {
  const container = useRef(null), map = useRef(null), routeLayer = useRef(null), selectionLayer = useRef(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    const instance = L.map(container.current, { minZoom: 15, maxZoom: 20, zoomSnap: 0.25,
      maxBounds: [[22.2798, 114.1318], [22.2857, 114.1422]], maxBoundsViscosity: 0.8,
      attributionControl: true, scrollWheelZoom: false });
    map.current = instance;
    instance.fitBounds(campusBounds, { padding: [22, 22] });
    instance.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>');
    L.control.scale({ imperial: false }).addTo(instance);
    L.geoJSON(mapFeatures, { style, onEachFeature(feature, layer) {
      const place = byOsm.get(feature.properties.osm);
      if (place) {
        layer.bindTooltip(labelNode(place.id), { permanent: true, direction: 'center', className: 'campus-building-label' });
        layer.on('click', () => select.current(place));
      } else if (feature.properties.name && feature.properties.kind === 'building') {
        layer.bindTooltip(labelNode(feature.properties.name));
      }
    }}).addTo(instance);
    routeLayer.current = L.layerGroup().addTo(instance);
    selectionLayer.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const layer = routeLayer.current; layer.clearLayers();
    if (!route?.geometry) {
      if (route?.status === 'shared-approach') {
        const [lng, lat] = route.fromEndpoint.coordinate;
        L.circleMarker([lat, lng], { radius: 10, color: '#b7672e', weight: 4, fillColor: '#16645e', fillOpacity: 1 })
          .bindTooltip(labelNode('Shared campus approach — follow building/floor signs')).addTo(layer);
        map.current.setView([lat, lng], 18);
      }
      return;
    }
    const line = L.geoJSON(route.geometry, { style: { color: '#ffffff', weight: 9, opacity: 0.95 } }).addTo(layer);
    for (const segment of route.segments) {
      L.polyline(segment.coordinates.map(([lng, lat]) => [lat, lng]),
        { color: segment.kind === 'steps' ? '#c16a28' : '#16645e', weight: 5,
          dashArray: segment.kind === 'steps' ? '3 6' : undefined }).addTo(layer);
    }
    const coordinates = route.geometry.coordinates;
    for (const [index, point] of [coordinates[0], coordinates.at(-1)].entries()) {
      L.circleMarker([point[1], point[0]], { radius: 8, color: '#fff', weight: 3,
        fillColor: index ? '#b7672e' : '#16645e', fillOpacity: 1 })
        .bindTooltip(labelNode(`${index ? 'Destination' : 'Start'}${
          (index ? route.toEndpoint : route.fromEndpoint).kind === 'nearby-approach' ? ' approach (entrance not mapped)' : ''}`)).addTo(layer);
    }
    map.current.fitBounds(line.getBounds(), { padding: [45, 45], maxZoom: 18.5 });
  }, [route, fitRequest]);

  useEffect(() => {
    if (!map.current) return;
    selectionLayer.current.clearLayers();
    if (!selectedPlace) return;
    const feature = mapFeatures.features.find(item => item.properties.osm === selectedPlace.osm);
    if (!feature) return;
    const selected = L.geoJSON(feature, { style: { color: '#16645e', weight: 3, fillColor: '#9ccbbd', fillOpacity: 0.8 } });
    selected.addTo(selectionLayer.current);
    map.current.panInsideBounds(selected.getBounds().pad(0.6));
  }, [selectedPlace]);

  useEffect(() => {
    if (map.current && !route?.geometry && route?.status !== 'shared-approach') map.current.fitBounds(campusBounds, { padding: [22, 22] });
  }, [fitRequest, route]);

  return <div ref={container} className="campus-map-canvas" role="region"
    aria-label="HKU Main and Centennial campus map. Use the building selector for keyboard access."/>;
}

export const mapSnapshot = mapFeatures.metadata.snapshot.slice(0, 10);
export const mapCoverage = mapFeatures.metadata.coverage;
