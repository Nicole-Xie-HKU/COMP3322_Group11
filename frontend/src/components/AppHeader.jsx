export default function AppHeader({ view, setView, savedCount }) {
  return <>
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
            SAVED SCHEDULES ({savedCount})
          </button>
          <button className={view === "credits" ? "active" : ""} onClick={()=>setView("credits")}>CREDITS</button>
        </div>
      </nav>

  </>;
}
