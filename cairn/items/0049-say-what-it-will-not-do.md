---
id: 49
title: Say what it will not do
type: feature
status: backlog
milestone: v0.7
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: m
---

## Problem

The landing page makes five assertive claims in a row and concedes nothing. The
README and `sources.md` both carry an honest-limits section and it is the most
trust-building writing in the project -- it is missing from the page that has
to earn the install.

Two things belong in it:

**It inherits a stale title.** namesync moves a name it does not write, so when
an agent sets a title early and stops revising it, the workspace name is old
and namesync is mirroring faithfully. Lowering `similarityThreshold` will not
help, because the source has not changed. This is worth saying out loud on the
marketing page, not just in the docs.

**It will not prompt your agent.** herdr can send a prompt to a running agent,
so namesync could ask one what it is working on and get a perfect answer. It
does not and will not: that injects into your conversation, spends your tokens
and pollutes the transcript, to fix what is ultimately a cosmetic problem.

The second is the one that makes the first credible. A project that has clearly
thought about the shortcut and refused it reads differently from one that
merely lists a limitation.

## Proposal

Its own section, deliberately quiet and narrow -- prose, no table, no code. The
contrast after four assertive sections is the point, and it is why this one
does not fold into anything else.

Sits second-to-last, immediately before Install: the last thing read before the
install command should be the reason to trust it.

## Acceptance criteria

- [ ] Both limits stated plainly, without hedging them back into features
- [ ] Visually the quietest section on the page
- [ ] Immediately precedes Install
