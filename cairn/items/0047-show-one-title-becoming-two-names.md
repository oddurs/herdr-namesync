---
id: 47
title: Show one title becoming two names
type: feature
status: backlog
milestone: v0.7
depends_on:
- 46
created: 2026-09-07
updated: 2026-09-07
priority: p2
area: site
effort: m
---

## Problem

The landing page says nothing about the split between an agent name and a Space
label, which is the distinction the whole v0.6 milestone was about. An agent
name is an identifier -- `[a-z][a-z0-9_-]{0,31}`, unique among live agents. A
Space label is prose. The same intent lands as two different strings, and the
page never shows it.

It is also the most *demonstrable* thing namesync does. Most of the rest is a
policy decision you have to take on trust; this one is visible in two lines.

## Proposal

```
title      app-fix-the-auth-flow

agent      app-fix-the-auth-flow      identifier, kept as one
workspace  Fix the auth flow          prose, and the row above already says "app"
```

Mono, two columns, no prose needed. Form depends on 0046: its own section with
this as the visual, or a seventh row in the `rules` list carrying the idea in a
sentence.

## Acceptance criteria

- [ ] One title, two names, both correct against the current code
- [ ] The reason each surface differs is stated once, not twice
- [ ] Form matches whatever 0046 decided
