---
id: 66
title: The llm source can never run on a stale title
type: bug
status: done
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p0
area: sources
effort: s
---

## What happens

The llm source has never been consulted. Not once: 2,995 log lines, ten agents
currently flagged `$stale`, a configured endpoint, a working key in the running
daemon's environment, and zero `consulted llm for …` lines.

`observe()` walks the sources in order and returns the first non-empty answer.
`title` is first and returns `normalize(agent.terminal_title_stripped)`, which
for a stale agent is still a perfectly non-empty string — a description of work
that finished hours ago. So the loop returns on `title` and never reaches the
source underneath it.

`context.deep` only *permits* a costly source to be tried:

    if (source.costly && !context.deep) continue;

Nothing makes the cheap source stand aside once its answer has gone stale. So
the llm source is reachable only when the title is **absent**, which is not
staleness — it is a pane with no title at all, and by then there is nothing to
fall back *from*.

Which means the gate in `#deepWanted` is measuring exactly the right thing and
the answer is thrown away one function later.

Every claim made for this feature describes behaviour that cannot occur:

- README: "When a title goes stale namesync notices and can fall back to a
  model you configure"
- sources.md: "consulted only when the title has demonstrably gone stale"
- llm.js: "consulted only when the title has gone stale, the agent is settled,
  and the floor has elapsed"

## What should happen

When `deep` is true — the title has gone stale, the agent is settled, the floor
has elapsed — the cheap answer becomes a *fallback* rather than a return. The
costly source gets its turn, and its answer wins if it produces one; if it
returns nothing, errors, or times out, the title is used exactly as it is now.

When `deep` is false, nothing changes: first answer wins, no cost, no call.

That is what the fallback chain was always described as doing.

## Reproduction

1. Configure `sources.llm` with an endpoint, model and key.
2. Leave an agent long enough to be flagged `$stale`.
3. `grep consulted ~/.local/state/namesync/daemon.log` — nothing, ever.

## Acceptance criteria

- [ ] A stale title lets a costly source answer, and that answer wins
- [ ] A costly source returning nothing falls back to the title
- [ ] With `deep` false the costly source is never called
- [ ] Test covers all three
