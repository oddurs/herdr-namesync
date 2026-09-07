---
id: 21
title: Only look harder when the cheap answer has failed
type: feature
status: done
milestone: v0.3
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: s
area: policy
---

The trigger, and the thing that keeps a paid source affordable.

namesync already detects when the free signal has stopped moving: `$stale`
fires when a title survives several agent state transitions unchanged. That is
exactly the condition under which a more expensive source is worth consulting,
and the rest of the time it must not be.

    stale AND the agent has just finished  ->  consult the next source
    otherwise                              ->  the title stands

Finishing matters as a trigger because the pane shows a settled result rather
than a half-written one, and because it is an event rather than a poll. It is
not sufficient on its own: a title survives completions unchanged, which is how
staleness is measured in the first place.

Also needs a floor between consultations per workspace, so a session that
finishes repeatedly while genuinely stale cannot bill in a loop.
