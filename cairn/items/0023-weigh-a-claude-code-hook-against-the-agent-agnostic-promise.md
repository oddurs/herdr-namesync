---
id: 23
title: Weigh a Claude Code hook against the agent-agnostic promise
type: chore
status: done
milestone: v0.3
created: 2026-09-06
updated: 2026-09-06
priority: p2
effort: m
area: research
---

An alternative that needs no model at all.

A Claude Code Stop hook receives the transcript path, so the user's most recent
message is readable -- and that is the freshest statement of intent there is,
free and exact. herdr already installs a hook of its own for state detection,
so the mechanism is proven.

The cost is that it works for one agent. namesync currently reads whatever
herdr reports and works with all seventeen kinds herdr detects, which was
documented as a feature this week.

Worth answering before building: is a precise, free, Claude-only source better
than an approximate, paid, universal one? Possibly both, with the hook
preferred when present. Decide deliberately rather than by whichever is easier
to write.
