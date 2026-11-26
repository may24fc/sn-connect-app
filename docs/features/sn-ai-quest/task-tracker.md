# SN AI Quest Task Tracker

## Current Status

Proposal v3 (simplified) is drafted after COO and HR feedback. It has 3 volunteer teams, each with one AI member and one Dev member, and monthly rounds. Each team builds one automation useful to all its members and submits proof of time saved by the end of the month. There are no points or levels. The kickoff is in the week of 1 December, and Round 1 is proposed for January 2027. Still open: prize approval (A$250 per month for the winning team), the Round 1 start month, and the kickoff date. Nothing has been implemented in Control Hub yet. The v2 decisions below are partly replaced by v3 (levels, roles, progression, and rubric were removed).

- Current proposal: [discussion-plan-v3.md](./discussion-plan-v3.md) (simplified, monthly rounds)
- Previous versions: [discussion-plan-v2.md](./discussion-plan-v2.md), [discussion-plan.md](./discussion-plan.md) (kept for history)

## Decisions Recorded (HR feedback, 2026-11-16)

- Participation is voluntary. Groups are formed after sign-ups close.
- 3 groups of 4–5 members, each with one AI & Dev Guide. Guides are eligible for the prize.
- 10-minute weekly coaching during working hours, inside the stand-up, facilitated by AI & Dev.
- Progress is visible to everyone in Control Hub. Recordings are visible to judges only. The five levels are Exploration, Identifying an Opportunity, Developing an Automation Project, Testing, and Execution/Implementation.
- Judges score submissions in Control Hub. The judges include the COO.
- There is no 5-hour minimum; any time saved counts.
- May leads and officially opens the kickoff. HR is assistant lead.
- Recordings show progress and demos, not meetings.
- The prize is paid through payroll. A$250 per winning group is proposed and still awaiting approval.
- The title is "Founder", not "CEO".
- Launch is in December 2026.

## Tasks

### Done

- [x] Draft proposal v2 from HR feedback - 2026-11-16; added `docs/features/sn-ai-quest/discussion-plan-v2.md`. It adds a dated timeline, a 5-level progression mapped onto Worlds, group-size rules, a responsibilities table, a Control Hub visibility and scoring design, a level-based recording plan, a revised rubric and prize table, the time-saved formula with worked examples and how it's documented and communicated, a detailed solution-ownership process, an implementation plan, and a pilot review draft for discussion. Validation: documentation only.
- [x] Draft the SN AI Quest discussion plan (v1) - 2026-11-16; added `docs/features/sn-ai-quest/discussion-plan.md` and this tracker. Validation: documentation only. No code, migration, or UI change, so no browser or latency verification applies.

### In Progress

- None.

### Deferred

- None.

### Skipped

- [ ] Phase 0 pilot using only a shared sheet - skipped. HR wants progress and scoring in Control Hub from the start, so a simple form is used only for December sign-ups and as a backup if Phase 1 slips.

### Blocked

- [ ] Resolve the remaining decisions in v2 §14 (prize approval, pilot-review measures, kickoff and coaching dates, holiday break, Guide eligibility in World 2 and 3) - blocked on HR and Founder review. Resume once HR replies to v2.
- [ ] Phase 1 – Control Hub core (sign-ups, groups and roles, 5-level progress tracker visible to all, level submissions with judge-only recording links, time-saved logs, judge scoring screen), following the Wellness Bingo pattern (`apps/web/src/app/api/wellness-bingo/`). Bingo partnerships are two-person only, so groups need a new membership table. Recognition only accepts individual nominations in three fixed categories, so it doesn't fit group scoring. Blocked until the user approves a separate build plan. Target: live before 4 January 2027.
- [ ] Phase 2 – Game layer (coins, badges, original retro visuals) - blocked on Phase 1. Target: during World 1.
- [ ] Phase 3 – Power-Up Library and hours-saved dashboard - blocked on Phase 2. Target: before the pilot review in the week of 8 March 2027.

## Session History

- 2026-11-18: Wrote simplified proposal v3 (`discussion-plan-v3.md`) after COO and HR feedback. The COO said v2 was too much: building takes time, so progress shouldn't earn points, or teams will build forever. HR proposed 3 teams, each with one AI and one Dev member, working on any automation useful to all members, and submitting proof of time saved. Both want monthly rounds. Removed the levels, coins, badges, Worlds progression (pairs and individuals), member roles, the rubric, and the pilot-review metrics. v3 has monthly rounds with a fixed end-of-month deadline, judging on verified time saved and usefulness only, A$250 per month for the winning team (subject to approval), a judge-only demo video, and one named owner per automation. Weekly coaching and safe-use rules are kept. The task list above still describes the v2 scope and must be re-scoped to v3 before any Control Hub build plan. v3 needs only team submissions, judge scoring, and an hours-saved view.

- 2026-11-16: Wrote proposal v2 after HR feedback and kept v1 for history. Removed the legal and participation-options section and the per-person attribution, and changed "CEO" to "Founder". Made the AI & Dev Guides eligible for the prize, so the judges are now the Founder, COO, and HR (no AI & Dev judge). Replaced the 4-week stages with HR's five levels. Timeline: kickoff in the week of 1 December, sign-ups 1–11 December, groups announced 18 December, holiday break 21 December – 1 January (assumed; HR to confirm), World 1 from 4 January to 26 February 2027, pilot review in the week of 8 March, pairs from mid-March, individuals from May. Known risks: Phase 1 must be live before 4 January, built by the same AI & Dev team over the holidays (a shared tracker is the backup plan); the A$250 prize is still unapproved; Guide eligibility could tempt Guides to build solutions for their groups, which is addressed by the role rule and the demo recordings showing members' own work.
- 2026-11-16: Rewrote `discussion-plan.md` as a document HR can review, without per-person attribution or code paths. Added a one-page summary, cycle length and meeting format, scoring rubric and judges, a definition of the 5-hour rule, prize options and payment method, a policies and risks section, visibility and recording retention, and pilot review criteria. Corrected two earlier claims: Phase 0 case studies use a form instead of Recognition, and Wellness Bingo is a pattern to follow, not directly reusable, because it only supports pairs.
- 2026-11-16: Merged the original AI Champion brief, the SN AI Quest proposal, and the grouping suggestion into one discussion plan. Found existing Control Hub features to reuse: Wellness Bingo, Recognition, Standups, and AI Spending. No code or database changes were made.
