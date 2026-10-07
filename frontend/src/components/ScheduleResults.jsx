import { ChevronLeft, ChevronRight } from "lucide-react";
import Timetable from "./Timetable";
import ScheduleCompleteness from "./ScheduleCompleteness";

export default function ScheduleResults({ schedule, alreadySaved, busy, saves, saveSchedule, result,
  index, setIndex, loadMore, termInfo, locked, pinSection }) {
  return (
    <section
      className="schedule-panel"
      id="schedule-panel"
      aria-label="Schedule results"
    >
      <div className="schedule-toolbar">
        <div className="panel-title">
          <h2>Schedule results</h2>
        </div>
        <div className="schedule-actions">
          <button
            className="text-button"
            disabled={!schedule || alreadySaved || busy || !saves.ready}
            onClick={saveSchedule}
          >
            {alreadySaved ? "Saved" : "Save"}
          </button>
          <button
            className="text-button"
            disabled={!schedule}
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>
      <div className="results-bar">
        <div className="result-pager">
          <button
            className="result-arrow"
            aria-label="Previous schedule"
            disabled={!schedule || busy || index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ChevronLeft size={35} strokeWidth={3} />
          </button>
          <div className="result-counter" aria-live="polite">
            <span>{schedule?.fullyVerified === false ? "PROVISIONAL RESULT" : "RESULT"}</span>
            <strong>
              {schedule
                ? `${index + 1} OF ${result.schedules.length}`
                : "0 OF 0"}
            </strong>
          </div>
          <button
            className="result-arrow"
            aria-label="Next schedule"
            disabled={
              !schedule || busy || index === result.schedules.length - 1
            }
            onClick={() => setIndex(index + 1)}
          >
            <ChevronRight size={35} strokeWidth={3} />
          </button>
        </div>
      </div>
      {result && !result.schedules.length && (
        <div className="message warning" role="status">
          {result.searchComplete === false ? "Search is incomplete. Load more results to continue." : (result.diagnosis?.[0]?.message || "No matching schedule. Change a section or remove a course.")}
        </div>
      )}
      {result?.nextCursor && <p className="schedule-note">
        {result.schedules.length} results loaded; search is not complete.
        <button className="text-button" disabled={busy} onClick={loadMore}>Load more results</button>
      </p>}
      {result?.warnings?.map((warning,i)=><p className="schedule-note" key={i}>{warning}</p>)}
      {result?.skipped?.length > 0 && (
        <p className="message warning">
          Not scheduled this term:{" "}
          {result.skipped.map((item) => item.course).join(", ")}.
        </p>
      )}
      <ScheduleCompleteness schedule={schedule}/>
      <Timetable
        schedule={schedule}
        term={termInfo}
        locked={locked}
        onPin={pinSection}
        busy={busy}
      />
      <div className="calendar-footer">
        <span>
          {schedule ? `${new Set(schedule.sections.map(s => s.courseCode)).size} courses` : ""}
        </span>
        <span>Hong Kong time</span>
      </div>
    </section>
  );
}
