---
name: ui-ux-reference-review
description: Review, plan, or materially change a user-facing screen or workflow using verified patterns from relevant, established products. Use for navigation, information hierarchy, interaction, accessibility, responsive behavior, and user-flow friction; not for a copy-only edit or a prescribed one-line visual fix.
---

# UI/UX Reference Review

Use external products as evidence, not templates to copy. The result should help this app's users complete their actual work with less ambiguity and friction.

## Establish the local experience

- Identify the user roles, primary jobs, and the path into and out of the screen. Inspect the current UI, data contract, and adjacent views; distinguish a confirmed defect from an inference or preference.
- For a review, remain read-only except for documentation the repository requires. For an implementation request, change only the authorized scope and follow `AGENTS.md` verification and tracking rules.
- Check the full journey, not just the default screenshot: populated, empty, loading, error, long-content, narrow viewport, keyboard, and permission states where relevant. Use Playwright for actual UI changes as required by `AGENTS.md`.

## Research transferable patterns

- Look up current, first-party documentation or product guidance from two or more established apps that solve a comparable job. Prefer the closest workflow over the most famous brand. Verify links and current behavior; do not rely on memory for changing product features.
- Record the exact pattern and why it works: for example, a shareable filtered view, a clear status explanation, or a recoverable drag action. Separate what the source documents from your inference about this app.
- Compare the pattern with this app's roles, data semantics, scale, and constraints. Do not recommend a control that the underlying API cannot support honestly, or copy a competitor's visual styling just because it looks polished.

## Judge and communicate

- Prioritize correctness and trust first, then task completion, accessibility, navigation, responsiveness, and visual polish. Flag misleading counts, metrics, or reward-related signals before cosmetic inconsistencies.
- For each material recommendation, give: local evidence or file/screen location, a reference link, the proposed behavior, the user benefit, and a testable acceptance condition. Include tradeoffs or prerequisites when the data model, permissions, or performance may change.
- Present a small, ordered rollout rather than a long wish list. Mark what was observed in code, exercised in a browser, or only inferred. Do not imply a live production review if none occurred.
- If implementing, verify the changed flow with real browser interactions and document remaining limitations. Do not claim the change is faster without the repository's required before/after latency measurements.
