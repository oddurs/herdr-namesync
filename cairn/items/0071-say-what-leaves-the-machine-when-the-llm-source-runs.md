---
id: 71
title: Say what leaves the machine when the llm source runs
type: docs
status: done
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p1
area: sources
effort: s
---

## Problem

The llm source sends up to `maxChars` (4,000 by default) of cleaned pane
content, plus recent things the user typed read out of the agent's transcript,
to whatever endpoint is configured. Unattended, on a background timer, for
every stale agent.

Nowhere does the documentation say that. `sources.md` explains endpoints, keys,
model choice, reasoning budgets and where to put the key — and never states the
plain fact that the contents of your screen leave the machine. The closest it
comes is describing *what it is given*, which reads as an implementation
detail rather than as a disclosure.

The screen of a coding agent is a bad thing to be casual about. It carries
source code, file paths, occasionally a key somebody echoed, and the last few
prompts the user wrote in their own words.

That the feature is off by default is not a substitute. It is on for anyone who
configured it, and thirteen consultations went out in the first minutes after
the fallback started working.

## Proposal

Say it plainly, where somebody deciding whether to turn the feature on will
read it — top of the llm section in `sources.md`, and a line in the README and
on the landing page where the model fallback is introduced.

Say what is sent, how much, how often, and to whom (the endpoint they chose).
Note that a local endpoint sends it no further than the machine, which is the
honest argument for [[prefer-a-local-model]] rather than a marketing one.

No hedging it into a feature. A disclosure that reads as a benefit is not a
disclosure.

## Acceptance criteria

- [ ] `sources.md` states what is transmitted before it explains configuration
- [ ] The README and landing page say it where the fallback is introduced
- [ ] The wording survives being read by somebody who is against the idea
