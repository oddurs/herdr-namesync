---
id: 15
title: Clearing a name should hand it back
type: bug
status: doing
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: s
area: policy
---

Renaming a workspace by hand holds the name for good. Clearing that name does
not release it, so the workspace sits empty and nothing will ever fill it:

  held workspace, label cleared to ""   -> "name locked (edited by hand)"

The user has to know `namesync unlock` exists, and that it is the thing to
reach for after clearing a field. Nobody does.

Clearing a name is the clearest possible statement that you do not want the
one you had. Treat it as handing the workspace back: release the hold, and let
the next sync fill it from the agent's current intent.

The promise is unchanged — a name you *wrote* still wins. An empty string is
not a name.
