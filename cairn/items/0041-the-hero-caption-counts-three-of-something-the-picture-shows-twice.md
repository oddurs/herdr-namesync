---
id: 41
title: The hero caption counts three of something the picture shows twice
type: bug
status: done
milestone: v0.7
created: 2026-09-07
updated: 2026-09-07
priority: p2
area: site
effort: s
---

## What happens

`Workspaces.astro` captions the mock:

> Three of these live in folders called `unifont`. Two were named by hand and
> stay exactly as they are.

The claim is true -- rows 1, 2 and 3 are all checkouts of fontina and all three
sit in `unifont/` -- but row 1 is one of the two held rows, so its label reads
`testing`. The picture shows `unifont` **twice**. A reader counts, gets two,
and concludes the caption is wrong.

The same mistake was in the README, where the before-block was introduced as
six directories when two of the six were hand-typed names. Fixed there; the
caption is the other half of it.

## What should happen

Say it so the picture supports it. The point is that the folder name is not the
project, and it survives being made about the two rows that visibly show it --
or the caption names row 1 as the third, held, checkout explicitly.

Worth deciding rather than patching: the caption is carrying two arguments at
once (folders lie, held names survive) and it is the weaker one that causes the
miscount.

## Reproduction

1. Look at the hero mock, count the rows reading `unifont`.
2. Two. The caption says three.

## Acceptance criteria

- [ ] The caption's count matches what the mock renders
- [ ] The "folders lie" argument survives
