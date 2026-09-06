---
id: 2
title: Cut the tmux and osc sinks
type: chore
status: doing
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: s
area: scope
---

The multiplexer-agnostic framing does not survive contact with the code.

`tmuxTarget` is referenced nowhere outside `sinks/tmux.js`, so no caller ever
supplies it. Every rename falls back to `cfg.target || $TMUX_PANE` — a single
window. With ten workspaces, ten renames land on the same window and the last
one wins. The osc sink has no tests at all, and its own comment says it is
redundant for the case anyone would hit.

That is 75 lines against 46 for the herdr sink that actually works.

More fundamentally, most of namesync cannot exist outside herdr: metadata
tokens, $project, $since, $n, grouping, the workspace/tab/agent distinction.
tmux has no equivalent for any of it. Only bare renaming ports, and that is the
least interesting part.

- delete `src/sinks/tmux.js` and `src/sinks/osc.js`
- drop `sinks.tmux` and `sinks.osc` from config and the example
- drop `tmux` from package keywords
- keep `sinks/index.js` and the `kinds` guard: the seam between deciding and
  applying is worth keeping even with one implementation
