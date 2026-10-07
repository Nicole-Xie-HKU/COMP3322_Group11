import { Pin, X } from "lucide-react";
import { fmtMin } from "../../../scheduler/scheduler";

const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CourseCard({
  course,
  color,
  locked,
  section,
  onLock,
  onPin,
  onRemove,
  disabled,
}) {
  const displayed =
    section || course.sections.find((item) => item.id === locked);
  return (
    <article className="course-card" style={{ "--course-color": color }}>
      <div className="course-card-heading">
        <strong>{course.code}</strong>
        <div className="flex items-center">
          {displayed && (
            <button
              className={`icon-button pin-button ${locked ? "pinned" : ""}`}
              disabled={disabled}
              aria-label={`${locked ? "Unpin" : "Pin"} ${course.code}`}
              aria-pressed={Boolean(locked)}
              title={
                locked
                  ? "Unpin this section"
                  : "Pin this section in all results"
              }
              onClick={() => onPin(displayed.id)}
            >
              <Pin size={17} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Remove ${course.code}`}
            onClick={onRemove}
            disabled={disabled}
          >
            <X size={17} />
          </button>
        </div>
      </div>
      <div className="course-card-body">
        <p className="course-title">{course.title}</p>
        <label className="section-label" htmlFor={`section-${course.code}`}>
          Class section
        </label>
        <select
          id={`section-${course.code}`}
          value={locked || ""}
          onChange={(event) => onLock(event.target.value)}
          disabled={disabled}
        >
          <option value="">Any section ({course.sections.length})</option>
          {course.sections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
              {item.instructor ? ` · ${item.instructor}` : ""}
            </option>
          ))}
        </select>
        {displayed && (
          <div className="section-details">
            <div className="flex items-center justify-between gap-2">
              <strong>Section {displayed.id}</strong>
              <span>Class {displayed.classNumber}</span>
            </div>
            {displayed.instructor && <p>{displayed.instructor}</p>}
            {displayed.meetings.map((meeting, index) => (
              <p key={index}>
                {days[meeting.day]} {fmtMin(meeting.start)}–
                {fmtMin(meeting.end)}
                {meeting.venue && ` · ${meeting.venue}`}
                {meeting.startDate && <small> ({meeting.startDate} – {meeting.endDate})</small>}
              </p>
            ))}
            {((Array.isArray(displayed.tba) ? displayed.tba.length > 0 : displayed.tba) || !displayed.meetings.length) && (
              <p className="tba-note">
                Time TBA.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
