# Feature Task Tracking Task Tracker

## Current Status

Completed. Repository guidance now requires durable per-feature task trackers for future implementation, investigation, and deferral work.

## Tasks

### Done
- [x] Define the feature task-tracker convention - 2026-10-02; changed `AGENTS.md` and `CLAUDE.md`; verified required location, statuses, and session-history guidance in both files and ran `git diff --check`.
- [x] Condense the repository operating guide - 2026-10-02; changed `CLAUDE.md`; verified `git diff --check`, required operating sections, and absence of duplicated architecture and Graphify sections.

### In Progress

None.

### Deferred

None.

### Skipped

None.

### Blocked

None.

## Session History
- 2026-10-02: Established `docs/features/<feature-slug>/task-tracker.md` as the durable handoff record. Trackers must distinguish completed, in-progress, deferred, skipped, and blocked work; future sessions must read the existing tracker before resuming a feature.
- 2026-10-02: Replaced the verbose CLAUDE.md architecture inventory with a concise operating guide. Graphify and AGENTS.md remain the source for architecture and code-relationship discovery.