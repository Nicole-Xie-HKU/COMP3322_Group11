import { useState } from "react";
import { buildICS, calendarFileName } from "../../../scheduler/scheduler";

// Browser-side download: the calendar file is built from server-verified schedule data.
export function useCalendarExport() {
  const [exportStatus, setExportStatus] = useState("");
  function exportCalendar(schedule, termInfo) {
    if (!schedule) return;
    try {
      const { text, eventCount, tbaCount } = buildICS(schedule, termInfo);
      if (!eventCount) {
        setExportStatus("Nothing to export: every selected section has an unknown time (TBA).");
        return;
      }
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = calendarFileName(schedule, termInfo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus(`Exported ${eventCount} recurring series${tbaCount ? `; ${tbaCount} TBA row(s) skipped` : ""}.`);
    } catch (error) {
      setExportStatus(`Export failed: ${error.message}`);
    }
  }
  return { exportCalendar, exportStatus };
}
