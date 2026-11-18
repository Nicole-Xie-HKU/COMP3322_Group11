# Walking-route presentation — 2026-11-18

[Status](../../../TASK_PROGRESS.md) · [Feature](../features/campus-map.md) · [Connection data](../features/campus-map-connections.md)

The user requested removal of **User-confirmed (approximate)** from the legend and the **All 22 listed buildings…** banner, explaining that the connections are simply walking routes.

Removed both blocks and their unused CSS. CYM connections now use the same solid-green styling as other walking segments. Removed source-specific badges, tooltips, purple-dash explanations and transfer wording for consistency. Mapped stairs remain orange/dashed, nearby approaches remain labeled, and general time/access limitations remain. All displayed route distances use **meters estimated**.

This is presentation-only. The routing algorithm, connection provenance, graph, path geometry, estimates, source restrictions, backend and database are unchanged. Prior documentation/screenshots describe the earlier presentation and remain historical evidence.

Baseline and final regression both passed 107/107. Host/Docker builds passed with the existing large-chunk warnings. Supplemental source/layer/link checks and `git diff --check` passed. Map/network SHA-256 values match before and after; routing data was not regenerated or edited. Existing protected-source and root/CSS audit issues remain outside this UI change.

Updated only the local app container with `--no-deps`. MySQL container identity/start time stayed identical and readiness returned `ready`. Chrome verification reproduced the user's CYP→MB route at the unchanged 493 m / 9 min: no coverage banner, source label, purple segment or source-specific badge; ordinary walking and stair styles remain. Unknown venues still show Route unavailable. No captured console errors/warnings or horizontal overflow.

Used and closed a separate Chrome QA tab to avoid reloading the user's existing page or discarding unsaved planner state. The user can refresh that page when ready. No database writes, public deployment, new dependency or source-data changes. This is engineering work, so course-learning vault sync is not applicable.

Evidence: `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/campus-map-evidence-2026-11-18/presentation.md`.

Status: complete and live at http://localhost:13601/. Refresh the existing page to load the simplified display.
