import { useEffect, useState } from 'react';
import { getWeeklyTransfers } from '../public.js';
import '../campus.css';

const timeLabel = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TransferPanel({ schedule, range, term, onOpenRoute }) {
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setResult(null); setError('');
    if (schedule && range) getWeeklyTransfers(schedule, range, term).then(value => {
      if (active) setResult({ ...value, schedule, range });
    }).catch(() => { if (active) setError('Walking routes could not load. Retry to use the bundled map data.'); });
    return () => { active = false; };
  }, [schedule, range, term, attempt]);
  if (!schedule || !range) return null;
  const current = result?.schedule === schedule && result?.range === range ? result : null;
  return <section className="campus-transfers" aria-label="Between classes">
    <h3>Between classes <span>Displayed week</span></h3>
    {error ? <p role="alert">{error} <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> :
      !current ? <p role="status">Checking this week’s transfers…</p> : current.notice ? <p>{current.notice}</p> :
      !current.transfers.length ? <p>No consecutive room changes to show this week.</p> :
      <ul>{current.transfers.map(transfer => <li key={transfer.id}>
        <div><strong>{days[transfer.day]} {transfer.date.slice(5)} · {transfer.fromVenue} → {transfer.toVenue}</strong>
          <span>{transfer.fromCourse} → {transfer.toCourse} · {timeLabel(transfer.endTime)}–{timeLabel(transfer.startTime)}</span>
          <span>{transfer.route.minutes === null ? 'Route unavailable' : `${transfer.route.minutes} min estimated walk`} · {transfer.gap} min gap</span>
          {transfer.route.status === 'unavailable' && <span>{transfer.route.reason}</span>}</div>
        <button className="secondary-button campus-secondary" onClick={() => onOpenRoute(transfer)}>
          {transfer.route.status === 'unavailable' ? 'Check map' : 'View route'}</button>
      </li>)}</ul>}
  </section>;
}
