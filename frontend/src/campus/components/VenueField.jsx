import { useId } from 'react';
import { places, resolveVenue } from '../public.js';

export default function VenueField({ label, value, onChange }) {
  const id = useId(), place = resolveVenue(value);
  return <div className="campus-field">
    <label htmlFor={id}>{label}</label>
    <div className="search-field"><input id={id} value={value} onChange={event => onChange(event.target.value)}
      list={`${id}-choices`} placeholder="Building or room, e.g. MB217" autoComplete="off"
      aria-describedby={`${id}-help`} maxLength={120}/></div>
    <datalist id={`${id}-choices`}>
      {places.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </datalist>
    <span id={`${id}-help`} className="campus-field-help">{place?.name || (value ? 'No supported building match' : 'Search by code or building name')}</span>
  </div>;
}
