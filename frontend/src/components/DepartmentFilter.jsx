import { useEffect, useState } from "react";
import { getDepartments } from "../api";

export default function DepartmentFilter({ selected, disabled, onChange, onToggle }) {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || departments) return;
    const controller = new AbortController();
    setError("");
    getDepartments(controller.signal)
      .then(rows => setDepartments(rows.map(row => row.dept)))
      .catch(err => {
        if (err.name !== "AbortError") setError("Could not load departments.");
      });
    return () => controller.abort();
  }, [open, departments]);

  return (
    <>
      <div className="course-search-heading">
        <label htmlFor="course-search">Find a course</label>
        <button
          type="button"
          className="text-button"
          aria-expanded={open}
          aria-controls="department-filters"
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
            onToggle();
          }}
        >
          Filter by Department
          {selected.length > 0 && ` (${selected.length})`}
        </button>
      </div>
      {open && (
        <div
          id="department-filters"
          className="dept-filter-panel"
          role="group"
          aria-label="Departments"
        >
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Show All
          </button>
          {error && <p className="dropdown-message" role="alert">{error}</p>}
          {!error && !departments && (
            <p className="dropdown-message" role="status">Loading departments…</p>
          )}
          {departments?.length === 0 && (
            <p className="dropdown-message">No departments found.</p>
          )}
          {departments?.map(dept => (
            <label key={dept} className="dept-filter-option">
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(dept)}
                onChange={event => onChange(event.target.checked
                  ? [...selected, dept]
                  : selected.filter(value => value !== dept))}
              />
              {dept}
            </label>
          ))}
        </div>
      )}
    </>
  );
}
