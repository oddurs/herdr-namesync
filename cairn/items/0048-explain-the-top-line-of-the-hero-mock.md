---
id: 48
title: Explain the top line of the hero mock
type: feature
status: done
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

The mock shows a state glyph, a number, a project, `worktree`, `held`, a branch
and a duration on its top line, and a name underneath. The page explains none
of it.

Every one of those is something namesync publishes and herdr would otherwise
not render. `$n` is the key that jumps there, and herdr has no built-in token
for it. `$project` is the repository rather than the folder, which is the
argument the caption is making three lines lower. `$worktree` is what stops a
linked worktree reading as a fourth clone.

And the reason there are two lines at all -- they age differently. Project and
branch are stable identity; the title underneath is whatever the agent is
describing right now. Putting the workspace label on both wastes one of them.
That is the whole design of the row and the page does not say it.

## Proposal

Annotate the mock rather than describe it in a paragraph somewhere else -- the
picture is right there, and a callout on the thing itself beats prose about it.
Form depends on 0046.

Keep it to the tokens the mock actually shows. The full table is in
`configuration.md` and `TOKENS.md`, and reproducing it here is how the landing
page turns back into documentation.

## Acceptance criteria

- [ ] `$n`, `$project` and `$worktree` are identified where they appear
- [ ] "The two lines age differently" is stated once
- [ ] No token table on the landing page
