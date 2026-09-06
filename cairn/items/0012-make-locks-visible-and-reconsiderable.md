---
id: 12
title: Make locks visible and reconsiderable
type: feature
status: backlog
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: m
area: policy
---

Measured on a live session: four of eleven spaces are locked, all locked 42
hours ago, and every one has drifted to zero token overlap with what its agent
is now doing.

  testing  ->  Astro docs site GNU style           overlap 0.00
  m5       ->  Richard Stallman perspective        overlap 0.00
  site     ->  Claude Code settings configuration  overlap 0.00
  cairn    ->  Open source project roadmap CLI     overlap 0.00

Three failures stacked on one mechanism:

- **Invisible.** Nothing in the sidebar distinguishes a frozen name from an
  accurate one. The single state that changes namesync's behaviour completely
  is the one state it never shows.
- **Permanent from one edit.** Rename once — deliberately, absently, or because
  of a bug — and that space loses the feature for good.
- **Never surfaced.** `status` prints raw ids with no labels and no drift, and
  only when asked.

"Your name wins" and "namesync goes silent forever without saying so" are
different promises. The second shipped while the first was documented.

The fix keeps the promise and makes it legible:

- publish `$locked` so the sidebar can mark a frozen name
- record the label a lock was protecting, and when
- `status` reports locks with labels, age and drift instead of bare ids
- when overlap reaches zero AND the agent has changed state since the lock,
  say so — a nudge, never an override
