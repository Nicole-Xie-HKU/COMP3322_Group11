import { useCallback, useState } from "react";

const KEY = "hkuplan.course-tags";
const MAX_TAGS = 5;
const MAX_LENGTH = 18;

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

const normalise = value => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_LENGTH);

// Per-course labels chosen by the student, kept in this browser only.
export function useCourseTags(term, code) {
  const key = `${term}|${code}`;
  const [tags, setTags] = useState(() => read()[key] ?? []);
  const write = useCallback(next => {
    setTags(next);
    // Storage can be unavailable; the in-memory value still applies.
    try {
      const all = read(); all[key] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  }, [key]);
  const add = useCallback(value => {
    const tag = normalise(value);
    if (!tag || tags.length >= MAX_TAGS || tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) return;
    write([...tags, tag]);
  }, [tags, write]);
  const remove = useCallback(value => write(tags.filter(tag => tag !== value)), [tags, write]);
  return { tags, add, remove, full: tags.length >= MAX_TAGS };
}
