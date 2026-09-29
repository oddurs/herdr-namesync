---
id: 81
title: A second line that says what is happening now
type: feature
status: done
milestone: v0.9
created: 2026-09-28
updated: 2026-09-28
priority: p1
area: sources
effort: m
---

## Problem

The second line of a row is the agent's terminal title, and agents set that
early and revise it rarely. By the afternoon it describes work that finished
before lunch. The `llm` source exists for exactly this, but it feeds the
*name*, which is deliberately slow: debounced, rate limited, held when a human
wrote it, and only consulted once the title has demonstrably gone stale. So
even with a model configured, the line that should say what is happening now
says what was happening this morning.

## Proposal

`$summary`: the person's last request condensed to a few words. A reminder
rather than a name, so no policy applies. The ask, not the activity: scanning
twelve panes, the question is "what am I asking each of these to do", and what
the agent is doing about it is on the screen when you get there.

- The model is given a small window of the freshest context, the last thing
  the person asked and the last twenty lines on screen, nothing older. More
  context was measured for the naming source and made answers worse; here it
  would also make them slower to change.
- Asked only when that window changes (hashed), at most once per
  `summary.intervalMs` per pane, never past `summary.maxPerHour` across all
  panes. A quiet session costs nothing.
- Published on pane and workspace. The value is whichever was said last: the
  model's line when newer than the title, the title otherwise. A title that
  would never be a name ("Claude Code") is no description either.
- The managed rows put it on the second line of both panels. Without a usable
  `llm` source it is the title, which is what the line showed before.
- The model request moves into one `ask` on the llm source, so both callers
  share endpoint, key, timeout and reasoning settings.

## Acceptance criteria

- [x] The window is one ask and `lines` screen lines, nothing older
- [x] An unchanged screen is never re-asked; a changed one waits for the interval
- [x] The hourly ceiling holds across panes, and `unknown` keeps the old line
- [x] `$summary` is whichever was said last, and a junk title never beats a description
- [x] Off by config, off without a model, forgotten with the pane
- [x] The managed rows show `$summary` on the second line of both panels
- [x] A cairn item or milestone in the window supersedes the model, free
