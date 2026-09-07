---
id: 25
title: Ground the model in the project name
type: feature
status: done
milestone: v0.4
created: 2026-09-06
updated: 2026-09-06
priority: p2
---

The llm source sends the recent asks and nothing else, so the model has no idea what the codebase is for. Measured against 8 live panes: telling it the project name never produced a worse label and occasionally produced a much better one (ptop: 'Planning and ordering tasks' -> 'UI design for process monitoring', because the name reads like htop).

The value is already on the agent as tokens.project, which resolves the repo name rather than the folder, so this costs nothing extra.

Richer context was measured and rejected: more session history is a net negative (recent asks are procedure -- 'plan build code-review pr merge' -- so more of them teaches the model to describe the workflow), and the README tagline split 2 wins to 3 losses because it dilutes asks that are already specific. See 0024.

Done when: the project reaches the model, the label never contains it, and a test proves both.
