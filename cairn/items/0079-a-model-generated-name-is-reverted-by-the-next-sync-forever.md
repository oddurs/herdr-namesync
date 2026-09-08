---
id: 79
title: A model-generated name is reverted by the next sync, forever
type: bug
status: done
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p0
area: sources
effort: m
---

## What happens

The sidebar has been oscillating. 509 of 655 renames in the daemon log returned
a target to a name it had already held; one workspace did it 38 times.

The sequence, from the log:

    01:01:08  'Rename verification' -> 'Fix stale data and LLM issues'
    01:01:39  'Fix stale data and LLM issues' -> 'Rename verification'
    01:11:09  'Rename verification' -> 'Fix stale data and LLM issues'
    01:11:40  'Fix stale data and LLM issues' -> 'Rename verification'
    01:21:33  'Rename verification' -> 'Fix stale data and LLM issues'
    01:22:06  'Fix stale data and LLM issues' -> 'Rename verification'

Ten minutes apart, then thirty-one seconds apart. Those are `deepIntervalMs`
and `minRenameIntervalMs`.

The costly source answers, the workspace is renamed to what it said, and
nothing anywhere records that this name replaced the title. On the very next
sync `deep` is false — the floor has not elapsed — so `observe` returns the
title source's answer, which is the same stale title as before. It differs from
the current label, the similarity is low, and it renames back. Ten minutes
later the floor clears and the whole thing happens again.

So the llm's answer survives exactly one rename interval before being undone,
every consultation is spent producing a name that is discarded, and the sidebar
flickers between two names all day.

This did not happen before the fallback was fixed, because the fallback never
ran. Fixing it turned a dead feature into a churning one.

## What should happen

A name obtained because the title had gone stale should stand *until the title
changes*. That is the whole premise: the agent stopped describing its work, so
something else described it, and the something else holds until the agent
speaks again.

Concretely: remember the costly answer against the title it replaced. While
that title is unchanged, keep using the answer rather than re-asking the cheap
source. When the agent finally revises its title, the stored answer is stale in
turn and the title wins again.

That also stops paying for the same consultation every ten minutes, which the
new ceiling would otherwise absorb by silently naming fewer panes.

## Reproduction

1. Configure the llm source and leave an agent until its title goes stale.
2. Watch the daemon log for twenty minutes.
3. Two renames per `deepIntervalMs`, back and forth, indefinitely.

## Acceptance criteria

- [ ] A costly answer survives subsequent syncs while the title is unchanged
- [ ] A changed title retakes the name
- [ ] No repeat consultation for a title that has already been answered
- [ ] A test that runs several syncs and asserts one rename, not many
