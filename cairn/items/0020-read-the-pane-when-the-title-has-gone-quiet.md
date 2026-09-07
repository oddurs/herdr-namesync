---
id: 20
title: Read the pane when the title has gone quiet
type: feature
status: done
milestone: v0.3
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: m
area: sources
---

Depends on the source interface.

herdr can read a pane, and the viewport carries what the agent is doing right
now -- far fresher than a title set hours ago:

    Running 1 shell command · 1m 7s…
      $ chmod +x scripts/preflight && bash -n scripts/preflight …
    Deciphering… (3m 57s · 10.0k tokens)

Verified: all four read sources cap at roughly 50 lines, because agents run on
the alternate screen and that scrollback never reaches herdr's host buffer. So
there is current activity but no history, which is enough for "what now" and
not enough for "what has this session been about".

`sources/viewport.js` reads it and extracts what it can without a model:
file paths being edited, the command running, the branch. That is an action
rather than an intent -- "Running a shell command" is not a name -- so on its
own it is unlikely to beat the title.

It is worth building anyway, because it is the input the llm source needs and
it proves the interface with something free. Judge it honestly when it lands:
if the names are worse than a stale title, keep it off by default and say so.
