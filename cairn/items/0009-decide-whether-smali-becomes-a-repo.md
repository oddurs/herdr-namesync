---
id: 9
title: Decide whether smali becomes a repo
type: chore
status: backlog
milestone: later
created: 2026-09-06
updated: 2026-09-06
priority: p2
effort: s
area: ecosystem
---

smali reads five namesync tokens by exact name and its README states that
tokens are "keyed by source, so they never collide" — which is wrong. Verified
against 0.8.2: one flat map, last writer wins, either source can clear the
other's key.

The correction has nowhere to land: smali is not a git repository. No history,
no remote, and it is GPL-3.0 against namesync's MIT, so publishing it is a
separate decision rather than an implied one.

Blocks nothing here. TOKENS.md already records the semantics from this side.
