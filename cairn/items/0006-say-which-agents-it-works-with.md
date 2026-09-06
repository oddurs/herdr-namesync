---
id: 6
title: Say which agents it works with
type: docs
status: backlog
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: s
area: docs
---

namesync reads whatever herdr reports as the pane's stripped terminal title, so
it works with any agent herdr detects — seventeen kinds ship with it, including
Codex, Copilot, Cursor, Droid, OpenCode and Qwen, not only Claude Code.

Nothing in the README says so, which makes it look Claude-specific. One line in
the opening and a note in Install: the plugin never asks which agent it is
talking to, and `herdr integration install <kind>` sharpens state detection for
whichever ones you use.
