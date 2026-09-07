---
id: 44
title: Name the alternatives on the landing page
type: feature
status: done
milestone: v0.7
depends_on:
- 43
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: m
---

## Problem

"Why another renamer" is the thinnest section on the page and it carries the
heaviest argument. Two paragraphs of prose, and it names not one of the
twenty-three plugins it is arguing against. A reader who is weighing namesync
against something specific gets nothing to weigh it with.

The README already does this properly, with a three-row table that names each
alternative and concedes what it is better at:

| Instead of | They are better when | namesync is better when |

Conceding is what makes it credible. A comparison that only lists our wins
reads as marketing; one that says "you want a breadcrumb, use theirs" reads as
someone who has actually used both.

## Proposal

Port the README table. `prose table` is already styled, so this is mostly copy.

It also solves a layout problem: sections 2 through 5 are typographically
identical -- `band`, `band__inner prose`, one 32rem column -- and the `rules`
list is the only variation on the page. A table here is the second variation,
and it lands early enough to break the block.

Keep the closing line, which is the actual thesis: the distinction is not what
a name is generated from, it is whether anything decides *when* it should
change.

## Acceptance criteria

- [ ] Three named alternatives, each with an honest "they are better when"
- [ ] Renders on a phone without horizontal scroll
- [ ] The thesis sentence survives as the section's last word
