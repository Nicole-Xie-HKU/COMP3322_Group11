import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ArrowLeft, MapPin, Route, RotateCcw, Focus } from 'lucide-react';
import { findCampusRoute, places, resolveVenue } from '../public.js';
import VenueField from './VenueField';
import RouteSummary from './RouteSummary';
import CampusCanvas, { mapSnapshot, mapCoverage } from './CampusCanvas';
import '../campus.css';

export default function CampusMap({ request, onBack }) {
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [route, setRoute] = useState(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [selectedPlace, setSelectedPlace] = useState(null);
  const [fitRequest, setFitRequest] = useState(0);
  const sequence = useRef(0);
  const heading = useRef(null);
  const hasMapRoute = route?.geometry || route?.status === 'shared-approach';
  async function search(origin = from, destination = to) {
    const current = ++sequence.current;
    setBusy(true); setRoute(null); setError('');
    try {
      const result = await findCampusRoute(origin, destination);
      if (current === sequence.current) setRoute(result);
    } catch {
      if (current === sequence.current) setError('The bundled route data could not load. Try finding the route again.');
    } finally { if (current === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    heading.current?.focus();
    if (request) {
      setFrom(request.fromVenue); setTo(request.toVenue);
      search(request.fromVenue, request.toVenue);
    }
    return () => { sequence.current += 1; };
  }, [request]);
  function edit(setValue, value) {
    sequence.current += 1; setValue(value); setRoute(null); setError(''); setBusy(false);
  }
  function swap() {
    setFrom(to); setTo(from); setSelectedPlace(null);
    if (from && to) search(to, from);
    else { sequence.current += 1; setRoute(null); setBusy(false); }
  }
  function reset() {
    sequence.current += 1; setFrom(''); setTo(''); setRoute(null); setError(''); setBusy(false);
    setSelectedPlace(null); setFitRequest(value => value + 1);
  }
  return <section className="campus-page" aria-labelledby="campus-heading">
    <div className="campus-page-heading panel-title">
      <div><h2 id="campus-heading" ref={heading} tabIndex={-1}>Find your way across campus</h2>
        <p>Main Campus &amp; Centennial Campus · Building-to-building walking routes</p></div>
      <button className="secondary-button campus-secondary" onClick={onBack}><ArrowLeft size={16}/> Back to timetable</button>
    </div>
    <div className="campus-layout">
      <aside className="campus-sidebar" aria-label="Route planner">
        <div className="campus-sidebar-title"><Route size={19}/><h3>Plan a walk</h3></div>
        <form onSubmit={event => { event.preventDefault(); setSelectedPlace(null); search(); }}>
          <VenueField label="From" value={from} onChange={value => edit(setFrom, value)}/>
          <button type="button" className="text-button campus-swap" onClick={swap} aria-label="Swap origin and destination"><ArrowDownUp size={16}/> Swap</button>
          <VenueField label="To" value={to} onChange={value => edit(setTo, value)}/>
          <div className="campus-form-actions"><button className="primary-button campus-primary" disabled={!from.trim() || !to.trim() || busy}>
            <Route size={16}/>{busy ? 'Finding route…' : 'Find walking route'}</button>
            <button type="button" className="secondary-button campus-reset" onClick={reset} aria-label="Reset route"><RotateCcw size={17}/></button></div>
        </form>
        <RouteSummary route={route} busy={busy} error={error}/>
        <details className="campus-coverage"><summary>Coverage and limitations</summary>
          <p>All {mapCoverage.directionalPairs} directional building pairs are supported. Some routes stop at a nearby mapped approach instead of an entrance; podium buildings can share an approach.</p>
          <p>Paths may include stairs and service roads; this is not step-free navigation. The final entrance/floor connection may be unmapped.</p>
          <p>Use campus signs and check current access. No live closures or room-level indoor directions are available.</p>
          <p>Map data: {mapSnapshot}. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap / ODbL</a>.</p>
        </details>
      </aside>
      <div className="campus-map-panel">
        <div className="campus-map-toolbar"><span><MapPin size={16}/> HKU campus</span>
          <button className="secondary-button campus-secondary" onClick={() => setFitRequest(value => value + 1)}><Focus size={16}/>{hasMapRoute ? 'Fit route' : 'Show campus'}</button></div>
        <CampusCanvas route={route} selectedPlace={selectedPlace} onSelect={setSelectedPlace} fitRequest={fitRequest}/>
        <div className="campus-map-legend"><span><i className="campus-line"/> Walking route</span>
          <span><i className="campus-line campus-steps"/> Stairs on route</span>
          <span>Scroll stays on the page · Use + / − to zoom</span></div>
        <div className="campus-place-picker"><label htmlFor="campus-building">Explore a building</label>
          <select id="campus-building" value={selectedPlace?.id || ''} onChange={event => setSelectedPlace(resolveVenue(event.target.value))}>
            <option value="">Select a building or click its outline</option>
            {places.map(place => <option key={place.id} value={place.id}>{place.id} — {place.name}</option>)}
          </select>
          {selectedPlace && <div className="campus-place-detail"><strong>{selectedPlace.name}</strong>
            <span>{selectedPlace.access.length ? selectedPlace.approach : `Nearby approach: ${selectedPlace.nearbyApproach.label}`}</span>
            <div><button className="secondary-button campus-secondary" onClick={() => edit(setFrom, selectedPlace.id)}>Use as start</button>
              <button className="secondary-button campus-secondary" onClick={() => edit(setTo, selectedPlace.id)}>Use as destination</button></div></div>}
        </div>
      </div>
    </div>
  </section>;
}
