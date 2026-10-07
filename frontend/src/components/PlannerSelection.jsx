import { colorFor } from "../../../scheduler/export";
import CourseSearch from "./CourseSearch";
import CourseCard from "./CourseCard";

export default function PlannerSelection({ terms, term, courses, courseCodes, schedule, locked, busy,
  changeTerm, addCourse, lockSection, pinSection, removeCourse, generate,
  includeUnknownTimes, setIncludeUnknownTimes, clearResults }) {
  return (
    <aside className="selection-panel" aria-label="Course selection">
      <div className="panel-title">
        <h2>Select courses</h2>
      </div>
      <div className="selection-controls">
        <label htmlFor="term">Term</label>
        <select
          id="term"
          value={term}
          disabled={busy || !terms.length}
          onChange={(event) => changeTerm(event.target.value)}
        >
          {!terms.length && <option>Loading terms…</option>}
          {terms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <CourseSearch
          key={term}
          term={term}
          selected={courseCodes}
          onSelect={addCourse}
          disabled={busy}
        />
      </div>
      <div className="selected-heading">
        <span>Selected courses</span>
        <span>{courses.length} / 12</span>
      </div>
      <div className="selected-courses">
        {!courses.length && (
          <p className="selection-empty">No courses selected.</p>
        )}
        {courses.map((course) => (
          <CourseCard
            key={course.code}
            course={course}
            color={colorFor(course.code, courseCodes)}
            section={schedule?.sections.find(
              (section) => section.courseCode === course.code,
            )}
            locked={locked[course.code]}
            disabled={busy}
            onLock={(section) => lockSection(course.code, section)}
            onPin={(section) => pinSection(course.code, section)}
            onRemove={() => removeCourse(course.code)}
          />
        ))}
      </div>
      <div className="generate-area">
        <label>
          <input type="checkbox" checked={includeUnknownTimes} disabled={busy}
            onChange={event => { setIncludeUnknownTimes(event.target.checked); clearResults(); }} />
          Include provisional results with unknown times
        </label>
        <button
          className="primary-button"
          onClick={() => generate()}
          disabled={!courses.length || busy}
        >
          {busy ? "Loading…" : "Generate schedules"}
        </button>
      </div>
    </aside>

  );
}
