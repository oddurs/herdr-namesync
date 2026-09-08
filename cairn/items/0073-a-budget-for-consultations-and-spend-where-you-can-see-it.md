---
id: 73
title: A budget for consultations, and spend where you can see it
type: feature
status: done
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p1
area: sources
effort: m
---

## Problem

`deepIntervalMs` is a floor per pane. There is no ceiling across panes, and no
ceiling across a day.

Ten stale agents at the default ten-minute floor is sixty requests an hour, and
the number of agents is exactly the thing this plugin exists to help with — so
the cost scales with the situation it is designed for. Thirteen consultations
went out within minutes of the fallback starting to work, which is the intended
behaviour and also the point: nothing anywhere would have said so.

`status` reports sources, sinks, locks, held names and stale titles. It does not
report that the llm was consulted at all, let alone how often. The daemon log
has one line per consultation and nobody reads a log to find out what a plugin
is spending.

A background process that makes metered API calls on your behalf should be able
to answer "how much have you spent today". This one cannot answer "how many
times have you run".

## Proposal

A global floor alongside the per-pane one — a maximum number of consultations
per hour across the whole session, applied before the pane floor so a busy
session degrades to naming fewer panes rather than billing more.

And counters in `status`: consultations today, consultations this hour, and
when the last one was. Tokens if the endpoint returns usage, which most
OpenAI-compatible ones do — but the count alone is the thing that turns an
invisible cost into a visible one.

Not a spend estimate in currency. Pricing is per-model and per-provider and
namesync has no business guessing it.

## Acceptance criteria

- [ ] A configurable ceiling on consultations per hour, session-wide
- [ ] Reaching it degrades gracefully and says so in `dry-run`
- [ ] `status` reports consultation counts and the last one's time
- [ ] The default is generous enough that nobody hits it by accident
