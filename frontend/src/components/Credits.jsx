export default function Credits() {
  return <section className="saved-panel" aria-label="Credits">
    <div className="panel-title"><h2>Credits</h2></div>
    <p>HKUPlan is a COMP3322 Group 11 project. Course data comes from the team's supplied HKU timetable workbook. This is a planning tool, not a live registration service.</p>
    <p>The interface uses <a href="https://react.dev/">React</a>, <a href="https://vite.dev/">Vite</a>, <a href="https://tailwindcss.com/">Tailwind CSS</a>, <a href="https://fullcalendar.io/">FullCalendar</a> and <a href="https://lucide.dev/">Lucide</a>. The university logo was supplied in the team's frontend; no university endorsement is claimed.</p>
    <p>The backend uses Node.js, Express, MySQL/mysql2, ExcelJS, Zod, Helmet, CORS and express-rate-limit. The scheduling algorithm is based on the team's scheduler-v3 work, with date, identity and resumable-search repairs.</p>
    <p>Backend integration, tests and documentation were developed with Codex AI assistance. Team members remain responsible for review, understanding, attribution and submission. Package license notices remain in the dependencies.</p>
  </section>;
}
