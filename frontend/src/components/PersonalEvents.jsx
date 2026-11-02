import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmtMin } from "../../../scheduler/scheduler";

const DAYS = [["1", "Mon"], ["2", "Tue"], ["3", "Wed"], ["4", "Thu"], ["5", "Fri"], ["6", "Sat"], ["7", "Sun"]];
const toMinutes = value => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };

export default function PersonalEvents({ events, onAdd, onRemove, disabled }) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("weekly");
  const [day, setDay] = useState("3");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("16:00");
  const [hard, setHard] = useState(true);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const from = toMinutes(start), to = toMinutes(end);
    if (!(from < to)) { setError("The end time must be after the start time."); return; }
    if (mode === "date" && !date) { setError("Choose a date for a one-off event."); return; }
    onAdd({ label: label.trim() || (mode === "date" ? "Personal event" : "Weekly commitment"), hard, start: from, end: to,
      ...(mode === "date" ? { date } : { day: Number(day) }) });
    setLabel(""); setError("");
  }
  const hardCount = events.filter(event => event.hard !== false).length;
  const weekday = value => DAYS.find(([key]) => Number(key) === value)?.[1] ?? "Mon";
  return (
    <section className="events-panel" aria-label="Personal events">
      <div className="events-heading">
        <strong>Personal events</strong>
        <span>{events.length} saved · {hardCount} hard</span>
      </div>
      <p className="events-hint">Hard events remove overlapping sections before scheduling. Soft events only lower a result's score.</p>
      {events.length > 0 && (
        <ul className="event-list">
          {events.map(event => (
            <li key={event.id} className="event-row">
              <span>{event.label || "Personal event"}</span>
              <span className="event-time">{event.date ?? weekday(event.day)} {fmtMin(event.start)}–{fmtMin(event.end)}</span>
              {event.hard === false && <span className="tag tag--custom">soft</span>}
              <button type="button" className="icon-button" aria-label={`Remove ${event.label || "event"}`}
                disabled={disabled} onClick={() => onRemove(event.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <form className="event-form" onSubmit={submit}>
        <input aria-label="Event name" maxLength={40} placeholder="Event name (e.g. internship)" value={label}
          onChange={event => setLabel(event.target.value)} disabled={disabled} />
        <div className="event-form-row">
          <select aria-label="Repeat" value={mode} onChange={event => setMode(event.target.value)} disabled={disabled}>
            <option value="weekly">Every week</option>
            <option value="date">One date</option>
          </select>
          {mode === "weekly" ? (
            <select aria-label="Weekday" value={day} onChange={event => setDay(event.target.value)} disabled={disabled}>
              {DAYS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          ) : (
            <input aria-label="Date" type="date" value={date} onChange={event => setDate(event.target.value)} disabled={disabled} />
          )}
          <input aria-label="Start time" type="time" step="300" value={start} onChange={event => setStart(event.target.value)} disabled={disabled} />
          <input aria-label="End time" type="time" step="300" value={end} onChange={event => setEnd(event.target.value)} disabled={disabled} />
        </div>
        <label className="event-hard">
          <input type="checkbox" checked={hard} onChange={event => setHard(event.target.checked)} disabled={disabled} />
          Hard constraint (hide conflicting sections)
        </label>
        {error && <p className="event-error" role="alert">{error}</p>}
        <button className="secondary-button" type="submit" disabled={disabled}><Plus size={14} /> Add event</button>
      </form>
    </section>
  );
}
