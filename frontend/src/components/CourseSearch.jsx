import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { searchCourses } from "../api";

export default function CourseSearch({ term, selected, onSelect, disabled }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const input = useRef(null);

  useEffect(() => {
    if (!open || !term) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setActive(-1);
    const timer = setTimeout(async () => {
      try {
        const courses = await searchCourses(term, query, controller.signal);
        setResults(courses);
      } catch (err) {
        if (err.name !== "AbortError")
          setError("Could not load courses. Retry search.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, query, open]);

  function choose(course) {
    if (selected.includes(course.code) || disabled) return;
    onSelect(course);
    setQuery("");
    setOpen(false);
    input.current.focus();
  }

  function handleKey(event) {
    if (event.key === "Escape") setOpen(false);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            results.length - 1,
            index + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
    }
    if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  }

  return (
    <div
      className="course-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor="course-search">Find a course</label>
      <div className={`search-field ${open ? "is-open" : ""}`}>
        <Search size={18} aria-hidden="true" />
        <input
          id="course-search"
          ref={input}
          role="combobox"
          autoComplete="off"
          placeholder="Course code or title"
          value={query}
          disabled={!term || disabled}
          aria-expanded={open}
          aria-controls="course-results"
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `course-result-${active}` : undefined
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKey}
        />
        <button
          type="button"
          className="icon-button"
          aria-label="Browse courses"
          disabled={!term || disabled}
          onClick={() => {
            input.current.focus();
            setOpen(true);
          }}
        >
          <ChevronDown size={17} />
        </button>
      </div>
      {open && (
        <div className="search-dropdown">
          <div className="dropdown-caption">
            {query ? "SEARCH RESULTS" : "BROWSE COURSES"} <span>{term}</span>
          </div>
          {loading ? (
            <p className="dropdown-message" role="status">
              Loading courses…
            </p>
          ) : error ? (
            <p className="dropdown-message" role="alert">
              {error}
            </p>
          ) : (
            <>
              <ul
                id="course-results"
                role="listbox"
                aria-label="Course results"
              >
                {results.map((course, index) => {
                  const added = selected.includes(course.code);
                  return (
                    <li
                      key={course.code}
                      id={`course-result-${index}`}
                      role="option"
                      aria-selected={added}
                    >
                      <button
                        type="button"
                        disabled={added || disabled}
                        className={active === index ? "active-result" : ""}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(course)}
                      >
                        <span>
                          <strong>{course.code}</strong>
                          <span className="result-title">{course.title}</span>
                          <small>
                            {course.sectionCount}{" "}
                            {course.sectionCount === 1 ? "section" : "sections"}
                          </small>
                        </span>
                        {added ? <Check size={17} /> : <Plus size={17} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!results.length && (
                <p className="dropdown-message">
                  No courses found.
                </p>
              )}
              {results.length === 30 && (
                <p className="dropdown-hint">
                  First 30 courses. Type to search.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
