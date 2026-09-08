---
id: 69
title: The comparison table misstates two of the three rivals
type: bug
status: backlog
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p0
area: docs
effort: s
---

## What happens

The table in the README and on the landing page describes what the three named
alternatives do. Two of the three descriptions are wrong, and both are wrong in
namesync's favour — which is the direction that costs credibility, because the
table exists for people who are about to click the links.

**herdr-automatic-rename** is filed under "you want to know *where* a pane is:
directory, branch, program". Its own README:

    [4] PROJ-482 › Fix the revenue query    current branch › what an agent is doing

It does where *and* what. The row implies it cannot see agent intent; it can,
and it says so in its fourth example.

**herdr-tab-smart-rename** is filed under "you want a model interpreting every
task", against namesync's "free by default, and a model only when it earns it".
Its own README, third bullet:

    Name known commands without an AI call. Use a model to interpret other tasks.

That is the same hybrid we are claiming as the distinction.

herdr-plugin-renamer's row is accurate.

For scale: 74, 69 and 13 stars, all three updated within two days of writing.
These are maintained projects with readers.

## What should happen

Rewrite both rows from what those projects actually claim, and let the
distinction be the one that survives it. namesync moves a name the agent
already published rather than generating one, and it is the only one of the
four with an articulated policy for *when* a name should change — debounce,
rate limit, similarity gate, stale detection, silence while blocked — with
`dry-run` printing the reason for every decision.

That is narrower than what the table claims now, and it is true.

Keep the concession structure. It is the right shape; it was just filled in
from memory rather than from their documentation.

## Acceptance criteria

- [ ] Each row quotes or fairly paraphrases the rival's own description
- [ ] No row claims a rival lacks something it documents
- [ ] README and `home.rs` say the same thing
