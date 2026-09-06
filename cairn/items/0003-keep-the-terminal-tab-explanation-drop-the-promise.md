---
id: 3
title: Keep the terminal-tab explanation, drop the promise
type: docs
status: doing
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: s
area: docs
---

The valuable part of "Other multiplexers" is not code, it is the answer to a
question people will actually ask: does this work with my terminal's tabs?

It does, and without namesync doing anything — an agent running in a Ghostty,
WezTerm, kitty or iTerm2 tab already sets that tab's title over OSC. And when
herdr is in between, herdr's own `window_title` template carries the workspace
name to the host tab.

Rewrite the page as "Terminal tabs": explain why they already work, and stop
implying namesync drives them.
