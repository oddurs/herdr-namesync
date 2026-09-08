---
id: 77
title: Reconsider the claim that the sidebar is otherwise not navigable
type: chore
status: backlog
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p2
area: docs
effort: s
---

`configuration.md` describes `$n`:

> The workspace's number — what `prefix+shift+N` jumps to. herdr has no
> built-in token for this, which is why the sidebar is otherwise not navigable.

The first half is true: herdr exposes no token for the number.

The second half is the part to look at. herdr-automatic-rename ships numbering
as a headline feature — "Every workspace and tab also carries the `1-9` key
that jumps to it" — and puts it directly in the name as `[1] zsh`. It even
documents where it stops, because no binding reaches a tenth row.

So the sidebar is not navigable *by default*, and namesync is not the only
answer to that. Ours is arguably the better shape — a token the row can place
where it likes, rather than a prefix baked into the label — and that is the
claim worth making instead.

Same file, and the same pass should check `setup.js`, whose managed block says
"herdr has no built-in token for any of them". That one is accurate.

Low priority: unlike 0069 and 0070 this is a shaded implication rather than a
false statement, and nobody has been misled by it yet. But it is the same
habit, and the habit is what produced the other two.

Done when: the sentence claims the shape of the solution rather than sole
possession of the problem.
