import { ChevronLeft, ChevronRight } from "lucide-react";
import Timetable from "./Timetable";
import ScheduleCompleteness from "./ScheduleCompleteness";
import TagRow from "./TagRow";
import { scheduleTags } from "../../../scheduler/scheduler";
import { useCalendarExport } from "../hooks/useCalendarExport";

export default function ScheduleResults({ schedule, alreadySaved, busy, saves, saveSchedule, result,
  index, setIndex, loadMore, termInfo, locked, pinSection, blocked = [] }) {
  const { exportCalendar, exportStatus } = useCalendarExport();
  const tags = schedule ? scheduleTags(schedule, { blocked }) : [];
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
            disabled={!schedule || busy}
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            className="text-button"
            disabled={!schedule || busy}
            onClick={() => exportCalendar(schedule, termInfo)}
          >
            Export .ics
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
          <div className="result-counter" aria-live="polite" aria-busy={busy}>
            <span>{schedule?.fullyVerified === false ? "PROVISIONAL RESULT" : "RESULT"}</span>
            <strong>
              {schedule
                ? `${index + 1} OF ${result.schedules.length}`
                : busy ? "…" : result ? "0 OF 0" : "—"}
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
      {result && !busy && !result.schedules.length && (
        <div className="message warning" role="status">
          {result.searchComplete === false ? "Search is incomplete. Load more results to continue." : (result.diagnosis?.[0]?.message || "No matching schedule. Change a section or remove a course.")}
        </div>
      )}
      {result?.nextCursor && <p className="schedule-note">
        {result.schedules.length} results loaded; search is not complete.
        <button className="text-button" disabled={busy} onClick={loadMore}>Load more results</button>
      </p>}
      {result?.eventImpact?.length > 0 && (
        <p className="schedule-note">
          Personal events removed candidate sections: {result.eventImpact.map(entry =>
            `${entry.course} (${entry.removed.map(item => item.key.split(":")[1]).join(", ")})`).join("; ")}.
        </p>
      )}
      {result?.warnings?.map((warning,i)=><p className="schedule-note" key={i}>{warning}</p>)}
      {result?.skipped?.length > 0 && (
        <p className="message warning">
          Not scheduled this term:{" "}
          {result.skipped.map((item) => item.course).join(", ")}.
        </p>
      )}
      <ScheduleCompleteness schedule={schedule}/>
      {schedule && <TagRow tags={tags} compact/>}
      {schedule && exportStatus && <p className="schedule-note export-status" role="status">{exportStatus}</p>}
      {schedule && (
        <details className="google-help">
          <summary>Import this file into Google Calendar</summary>
          <ol>
            <li>Download the file with <strong>Export .ics</strong> above.</li>
            <li>In Google Calendar open <strong>Settings → Import &amp; export</strong>, choose the file and a dedicated calendar.</li>
            <li>Importing copies events once. To refresh, delete that calendar and import the new file again.</li>
          </ol>
          <p>Times are Hong Kong time. Sections with an unknown time are skipped and reported above.</p>
        </details>
      )}
      <Timetable
        schedule={schedule}
        term={termInfo}
        locked={locked}
        blocked={blocked}
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
