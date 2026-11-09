import Timetable from "./Timetable";

export default function ScheduleComparison({
  left,
  right,
  clearComparison
}) {

  return (
    <section className="saved-panel">

      <div className="panel-title">
        <h2>Compare Schedules</h2>
      </div>

      <button
        className="secondary-button"
        onClick={clearComparison}
        style={{ margin: "12px 0" }}
      >
        Back
      </button>

      <div className="comparison-layout">

        <div className="comparison-side">

          <h3>
            {left.term}
          </h3>

          <Timetable
            schedule={left.schedule}
            term={null}
            locked={left.locked}
            blocked={left.blocked || []}
            busy={false}
            onPin={() => {}}
          />

        </div>

        <div className="comparison-side">

          <h3>
            {right.term}
          </h3>

          <Timetable
            schedule={right.schedule}
            term={null}
            locked={right.locked}
            blocked={right.blocked || []}
            busy={false}
            onPin={() => {}}
          />

        </div>

      </div>

    </section>
  );

}