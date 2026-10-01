import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { toFullCalendarEvents, toPrintRows } from "../../../scheduler/export";

export default function Timetable({ schedule, term, locked, onPin, busy }) {
  const calendar = useRef(null);
  const [weekTitle, setWeekTitle] = useState("");
  const teachingDates =
    schedule?.sections
      .flatMap((section) =>
        section.meetings.map((meeting) => meeting.startDate),
      )
      .filter(Boolean)
      .sort() || [];
  const startDate = teachingDates[0] || term?.startDate || "2026-09-01";
  const events = schedule ? toFullCalendarEvents(schedule, term) : [];
  const hasWeekend = events.some(
    (event) => event.daysOfWeek.includes(0) || event.daysOfWeek.includes(6),
  );
  const starts =
    schedule?.sections.flatMap((section) =>
      section.meetings.map((meeting) => meeting.start),
    ) || [];
  const ends =
    schedule?.sections.flatMap((section) =>
      section.meetings.map((meeting) => meeting.end),
    ) || [];
  const earliestHour = Math.min(8, Math.floor(Math.min(...starts) / 60));
  const latestHour = Math.min(
    24,
    Math.max(19, Math.ceil(Math.max(...ends) / 60)),
  );

  useEffect(() => {
    calendar.current?.getApi().gotoDate(startDate);
  }, [startDate]);

  return (
    <>
      <div className="calendar-heading">
        <span>Weekly timetable</span>
        <div className="week-controls">
          <button
            className="icon-button"
            aria-label="Previous week"
            onClick={() => calendar.current.getApi().prev()}
          >
            <ChevronLeft size={17} />
          </button>
          <span>{weekTitle}</span>
          <button
            className="icon-button"
            aria-label="Next week"
            onClick={() => calendar.current.getApi().next()}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="calendar-wrap">
        <FullCalendar
          ref={calendar}
          plugins={[timeGridPlugin]}
          initialView="timeGridWeek"
          initialDate={startDate}
          firstDay={1}
          weekends={hasWeekend}
          headerToolbar={false}
          timeZone="Asia/Hong_Kong"
          allDaySlot={false}
          slotMinTime={`${String(earliestHour).padStart(2, "0")}:00:00`}
          slotMaxTime={`${String(latestHour).padStart(2, "0")}:00:00`}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          }}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          height="auto"
          expandRows={true}
          nowIndicator={false}
          events={events}
          eventDisplay="block"
          displayEventTime={false}
          datesSet={(info) => setWeekTitle(info.view.title)}
          eventContent={({ event }) => {
            const { courseCode, sectionId, venue } = event.extendedProps;
            const pinned = locked[courseCode] === sectionId;
            return (
              <div className="calendar-event">
                <button
                  className={`calendar-pin ${pinned ? "pinned" : ""}`}
                  disabled={busy}
                  aria-label={`${pinned ? "Unpin" : "Pin"} ${event.title}`}
                  aria-pressed={pinned}
                  title={
                    pinned
                      ? "Unpin this section"
                      : "Pin this section in all results"
                  }
                  onClick={(click) => {
                    click.stopPropagation();
                    onPin(courseCode, sectionId);
                  }}
                >
                  <Pin size={12} />
                </button>
                <strong>{event.title}</strong>
                <span>{venue || "Venue TBA"}</span>
              </div>
            );
          }}
          eventDidMount={({ el, event }) => {
            el.title = `${event.title}\n${event.extendedProps.venue || "Venue TBA"}\n${event.extendedProps.instructor || ""}`;
          }}
        />
      </div>
      {schedule && (
        <table className="print-details">
          <caption>Course details</caption>
          <thead>
            <tr>
              <th>Course</th>
              <th>Section</th>
              <th>Day</th>
              <th>Time</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            {toPrintRows(schedule).map((row, index) => (
              <tr key={index}>
                <td>{row.course}</td>
                <td>{row.section}</td>
                <td>{row.day}</td>
                <td>{row.time}</td>
                <td>{row.venue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
