---
id: 16
title: namesync wakes itself up by publishing metadata
type: bug
status: doing
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: s
area: daemon
---

A metadata write emits `pane.updated`, which namesync subscribes to. So every
publish scheduled another sync, which published again.

Measured: 81 publishes in 20 minutes against 40 possible ticks, arriving in
pairs 3 seconds apart -- exactly the 2.5s debounce. Proven directly: writing a
token to a pane produced two `pane.updated` events for that pane.

Twice the work, and constant sidebar rewrites, which is what the flickering
looked like.

`pane.updated` fires for scroll position, cwd, agent detection and token
changes. namesync only cares about one of them: the stripped title. Remember
the last title seen per pane and ignore the event when it has not changed.

That closes the loop and drops the pointless syncs at the same time.
