import { meetingCompleteness } from "../../../scheduler/scheduler";

export default function ScheduleCompleteness({ schedule }) {
  if (!schedule) return null;
  const { unknownSectionKeys } = meetingCompleteness(schedule.sections);
  if (!unknownSectionKeys.length) return null;
  return <div className="message warning" role="status">
    <strong>Provisional timetable — conflicts are not fully verified.</strong>
    <p>These selected sections have unknown times. Unknown meetings cannot appear in the calendar:</p>
    <ul>{unknownSectionKeys.map(key => <li key={key}>{key.replace(":", " ")} — Time TBA</li>)}</ul>
  </div>;
}
