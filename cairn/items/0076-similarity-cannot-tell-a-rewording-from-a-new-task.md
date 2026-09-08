---
id: 76
title: Similarity cannot tell a rewording from a new task
type: feature
status: done
milestone: later
created: 2026-09-08
updated: 2026-09-08
priority: p2
area: naming
effort: m
---

## Problem

The similarity gate is Jaccard overlap over stemmed tokens with stop words
dropped. It is honest about being crude, and it is well chosen for the job it
was built for: an agent restating the same task in different words.

It cannot do the job it now also has. From the documented table:

| Current | Proposed | Overlap | Result |
| --- | --- | --- | --- |
| Fix auth middleware bug | Fix auth middleware tests | 0.60 | skipped |

Writing the tests for something is not the same task as fixing it, and the
overlap is high precisely because the subject is unchanged — which is the case
the metric cannot see. Lowering the threshold to catch it would start renaming
on genuine rewordings, because the metric has no way to distinguish the two.

This matters more now than when it was written. The llm source produces names
that are lexically unlike the title they replace, so they usually pass the
gate — while two *human* titles describing genuinely different work often do
not. The gate is most permissive where the input is least trustworthy.

## Proposal

Unclear, which is why this is filed rather than fixed. Options, none obviously
right:

- Weight the tail of a title over its head. The subject tends to come first and
  the verb of the moment last, so "…bug" to "…tests" is the informative part
  and it is exactly what Jaccard discards as one token among four.
- Ask the llm source, when it is already being consulted, whether the two
  describe the same work. Cheap when a call is happening anyway, and no new
  cost when it is not.
- Leave it, and accept that a same-subject-different-verb change is missed.
  It is a cosmetic miss, and the current behaviour never churns.

The third is defensible and should be the null hypothesis. Anything replacing
it has to be measured against real title pairs rather than invented ones —
`$age` data across a week of sessions would supply them.

## Acceptance criteria

- [ ] A corpus of real consecutive title pairs, labelled by hand
- [ ] Current behaviour measured against it before anything changes
- [ ] Any replacement beats it on that corpus, or the item is closed as declined

## Measured, and declined

The item asked for a corpus before anything changed. 239 unique consecutive
rename pairs came out of the daemon log, 228 of them real intent replacing real
intent rather than a folder name being adopted.

Similarity of the renames that were allowed through:

    0.0  ################################################ 201
    0.1  ###  12
    0.2  ##    6
    0.3  ##    4
    0.4  #     1
    0.5  ##    4

Eighty-eight per cent score zero — not one significant word in common — and
nothing at all lands between 0.5 and 1.0. The threshold sits at 0.6 in an empty
region of the distribution, which is the definition of a well-placed one. The
case this item was filed about, "fix the bug" against "write the tests" at
0.60, did not occur once in 228 real pairs.

So the metric is not the problem, and moving the threshold would be tuning
against a case that has never happened.

What the corpus did find is a real one, and the opposite shape: 509 of 655
renames returned a target to a name it had already held. Not a similarity
failure — the model's answer was being reverted by the next cheap sync and
re-obtained ten minutes later, for ever. Filed and fixed as 0079.

Declined. The corpus is the argument for leaving it alone, and it exists now if
anybody wants to revisit this with different data.

