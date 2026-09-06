---
id: 13
title: Detect and surface a stale title
type: feature
status: done
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: m
area: policy
---

namesync moves a name it does not write, so it inherits whatever the agent
publishes. Agents tend to set a title early and not revise it.

Confirmed live: the workspace running this very session read "Herdr session
naming plugin" through a website build, a type system, an open-source setup and
a release. Hours stale, and nothing indicated it.

It cannot be fixed at the source, but it can be detected. A title that has not
changed while the agent has gone through several state transitions is probably
describing work that finished a while ago.

- track title changes against state transitions per pane
- surface it in `status`, and as a token the sidebar can dim
- never rename on a guess — this is a signal, not an action
