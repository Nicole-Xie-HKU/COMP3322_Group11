import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { generateSchedules, getCourse, request } from "./api";
import { colorFor } from "../../scheduler/export";
import CourseSearch from "./components/CourseSearch";
import CourseCard from "./components/CourseCard";
import Timetable from "./components/Timetable";

import { useSavedSchedules } from "./hooks/useSavedSchedules";
import Credits from "./components/Credits";
import SavedSchedules from "./components/SavedSchedules";

export default function App() {
  const [terms, setTerms] = useState([]);
  const [term, setTerm] = useState("");
  const [courses, setCourses] = useState([]);
  const [locked, setLocked] = useState({});
  const [result, setResult] = useState(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("builder");
  const saves = useSavedSchedules(setError);
  const { saved } = saves;
  const schedule = result?.schedules[index];
  const termInfo = terms.find((item) => item.id === term);
  const courseCodes = courses.map((course) => course.code).sort();
  const alreadySaved =
    schedule &&
    saved.some(
      (item) => !item.legacy && item.term === term && (item.schedule?.id === schedule.id || item.sectionKeys?.slice().sort().join("|") === schedule.sections.map(s => `${s.courseCode}:${s.id}`).sort().join("|")),
    );

  useEffect(() => {
    request("/terms")
      .then((data) => {
        setTerms(data);
        setTerm(data[0]?.id || "");
      })
      .catch(() =>
        setError("Cannot connect to server. Refresh to retry."),
      );
  }, []);

  function clearResults() {
    setResult(null);
    setIndex(0);
    setError("");
    setNotice("");
  }

  function changeTerm(value) {
    setTerm(value);
    setCourses([]);
    setLocked({});
    clearResults();
  }

  async function addCourse(course) {
    if (courses.length >= 12) {
      setError("Maximum 12 courses.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const details = await getCourse(term, course.code);
      setCourses((current) => [...current, details]);
      clearResults();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function removeCourse(code) {
    setCourses(courses.filter((course) => course.code !== code));
    const next = { ...locked };
    delete next[code];
    setLocked(next);
    clearResults();
  }

  function lockSection(code, section) {
    const next = { ...locked };
    if (section) next[code] = section;
    else delete next[code];
    setLocked(next);
    clearResults();
  }

  async function generate(nextLocked = locked) {
    setBusy(true);
    clearResults();
    try {
      setResult(await generateSchedules(term, courses, nextLocked));
      setLocked(nextLocked);
      document
        .getElementById("schedule-panel")
        .scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function pinSection(code, section) {
    const next = { ...locked };
    if (next[code] === section) delete next[code];
    else next[code] = section;
    generate(next);
  }

  async function saveSchedule() {
    await savedAction(async () => { await saves.save(term,schedule); setNotice("Saved to MySQL for this browser."); });
  }
  async function savedAction(action) {
    setBusy(true); setError("");
    try { await action(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function openSaved(item) {
    await savedAction(async () => {
      const value=await saves.open(item);
      setTerm(value.term);setCourses(value.courses);setLocked(value.locked);
      setResult({schedules:[value.schedule],warnings:value.warnings||[],skipped:[],total:1,searchComplete:true});
      setIndex(0);setNotice(value.legacy?"Older local save (not stored on server).":"Saved schedule.");setView("builder");
    });
  }
  async function loadMore() {
    setBusy(true);setError("");
    try {
      const page=await generateSchedules(term,courses,locked,result.nextCursor);
      setResult(current=>({...page,schedules:[...current.schedules,...page.schedules]}));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          href="https://www.hku.hk/"
          target="_blank"
          rel="noreferrer"
          className="university-brand"
          aria-label="The University of Hong Kong"
        >
          <img src="/hku-logo.svg" alt="The University of Hong Kong" />
        </a>
        <h1>Visual Schedule Builder</h1>
      </header>

      <nav className="main-nav" aria-label="Main navigation">
        <div className="nav-inner">
          <button
            className={view === "builder" ? "active" : ""}
            aria-current={view === "builder" ? "page" : undefined}
            onClick={() => setView("builder")}
          >
            BUILD SCHEDULE
          </button>
          <button
            className={view === "saved" ? "active" : ""}
            aria-current={view === "saved" ? "page" : undefined}
            onClick={() => setView("saved")}
          >
            SAVED SCHEDULES ({saved.length})
          </button>
          <button className={view === "credits" ? "active" : ""} onClick={()=>setView("credits")}>CREDITS</button>
        </div>
      </nav>

      <main>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="message success" role="status">
            <Check size={16} />
            {notice}
          </div>
        )}

        {view === "builder" ? (
          <div className="planner-layout">
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
                <button
                  className="primary-button"
                  onClick={() => generate()}
                  disabled={!courses.length || busy}
                >
                  {busy ? "Loading…" : "Generate schedules"}
                </button>
              </div>
            </aside>

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
                    <span>RESULT</span>
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
                  {result.searchComplete === false ? "Search is incomplete. Load more results to continue." : "No matching schedule. Change a section or remove a course."}
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
              {schedule?.sections.some(
                (section) => (Array.isArray(section.tba) ? section.tba.length > 0 : section.tba) || !section.meetings.length,
              ) && (
                <p className="message warning">
                  TBA times excluded from conflict checks.
                </p>
              )}
              <Timetable
                schedule={schedule}
                term={termInfo}
                locked={locked}
                onPin={pinSection}
                busy={busy}
              />
              <div className="calendar-footer">
                <span>
                  {schedule ? `${schedule.sections.length} courses` : ""}
                </span>
                <span>Hong Kong time</span>
              </div>
            </section>
          </div>
        ) : view === "credits" ? <Credits/> : (
          <SavedSchedules saved={saved} busy={busy} onOpen={openSaved}
            onRemove={item=>savedAction(()=>saves.remove(item))}
            onRename={(item,name)=>savedAction(()=>saves.rename(item,name))}/>

        )}
      </main>
    </div>
  );
}
