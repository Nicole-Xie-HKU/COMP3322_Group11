import { useCallback, useEffect, useState } from "react";

const KEY = "hkuplan.personal-events";
const LIMIT = 16;

// Personal events live in this browser only; they are never uploaded as a profile.
function read() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(row => row && Number.isInteger(row.start) && Number.isInteger(row.end) && row.start < row.end)
      .slice(0, LIMIT)
      .map((row, index) => ({ ...row, id: row.id || `event-${index}` }));
  } catch { return []; }
}

export function usePersonalEvents() {
  const [events, setEvents] = useState(read);
  // Storage can be unavailable; the in-memory list still works.
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch {}
  }, [events]);
  const add = useCallback(draft => setEvents(current => current.length >= LIMIT
    ? current : [...current, { ...draft, id: `event-${Date.now()}-${current.length}` }]), []);
  const remove = useCallback(id => setEvents(current => current.filter(event => event.id !== id)), []);
  const replace = useCallback(next => setEvents(Array.isArray(next)
    ? next.map((event, index) => ({ ...event, id: event.id || `saved-${index}` })).slice(0, LIMIT) : []), []);
  return { events, add, remove, replace };
}
