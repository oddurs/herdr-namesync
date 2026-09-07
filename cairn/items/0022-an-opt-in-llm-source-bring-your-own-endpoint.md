---
id: 22
title: An opt-in llm source, bring your own endpoint
type: feature
status: done
milestone: v0.3
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: l
area: sources
---

Depends on the source interface, the viewport source and the staleness trigger.

This reverses the founding claim, so it should be argued rather than assumed.
"Nothing generates the name" was right about what was available: the agent had
already written one. Hours of live use proved that source unreliable over long
sessions -- the workspace running this very work sat on one title through a
website build, a type system and a release.

So: generation becomes possible, never default.

- off unless configured; no key, no calls, no behaviour change
- bring your own endpoint. A local model satisfies this as well as a hosted
  one, and no vendor is named in the code
- input is the viewport, which is what the agent is doing now
- output is 2-4 words, slugged and validated like any other name
- consulted only on the staleness trigger, never on a schedule
- the result goes through the same policy: a generated name has no more
  authority than a title, and can be held, skipped or rate limited exactly the
  same way

Explicitly out of scope: `agent.prompt`. herdr can send a prompt to a running
agent, so namesync *could* ask it what it is doing. It must not. That injects
into the user's conversation, spends their tokens and pollutes the transcript
to fix a cosmetic problem.
