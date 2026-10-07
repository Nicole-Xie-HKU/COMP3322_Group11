import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { generateSchedules, getCourse, request } from "./api";

import { useSavedSchedules } from "./hooks/useSavedSchedules";
import Credits from "./components/Credits";
import SavedSchedules from "./components/SavedSchedules";

import AppHeader from "./components/AppHeader";
import PlannerSelection from "./components/PlannerSelection";
import ScheduleResults from "./components/ScheduleResults";
import { meetingCompleteness, hasImpossibleMeetingDates } from "../../scheduler/scheduler";

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
  const [includeUnknownTimes, setIncludeUnknownTimes] = useState(false);
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
      setResult(await generateSchedules(term, courses, nextLocked, undefined, includeUnknownTimes));
      setLocked(nextLocked);
      document
        .getElementById("schedule-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      if (value.schedule.sections.some(hasImpossibleMeetingDates)) {
        throw new Error("This saved section has a weekday outside its teaching dates. The source dates need correction.");
      }
      setTerm(value.term);setCourses(value.courses);setLocked(value.locked);
      setIncludeUnknownTimes(!meetingCompleteness(value.schedule.sections).fullyVerified);
      setResult({schedules:[{...value.schedule,...meetingCompleteness(value.schedule.sections)}],warnings:value.warnings||[],skipped:[],total:1,searchComplete:true});
      setIndex(0);setNotice(value.legacy?"Older local save (not stored on server).":"Saved schedule.");setView("builder");
    });
  }
  async function loadMore() {
    setBusy(true);setError("");
    try {
      const page=await generateSchedules(term,courses,locked,result.nextCursor,includeUnknownTimes);
      setResult(current=>({...page,schedules:[...current.schedules,...page.schedules]}));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="app-shell">
      <AppHeader view={view} setView={setView} savedCount={saved.length}/>

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
            <PlannerSelection {...{ terms, term, courses, courseCodes, schedule, locked, busy,
              changeTerm, addCourse, lockSection, pinSection, removeCourse, generate,
              includeUnknownTimes, setIncludeUnknownTimes, clearResults }}/>
            <ScheduleResults {...{ schedule, alreadySaved, busy, saves, saveSchedule, result,
              index, setIndex, loadMore, termInfo, locked, pinSection }}/>
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
