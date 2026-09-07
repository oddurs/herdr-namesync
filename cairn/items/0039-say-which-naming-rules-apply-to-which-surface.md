---
id: 39
title: Say which naming rules apply to which surface
type: docs
status: done
milestone: v0.6
created: 2026-09-07
updated: 2026-09-07
priority: p2
area: docs
effort: s
---

## Problem

The docs explain the Spaces/Agents split for *metadata* well -- which panel
resolves `$name` from where, which tokens are workspace-only, why `$since`
belongs in one panel and `$age` in the other. TOKENS.md is a real contract.

The *label* rules got no such treatment, and they differ just as much:

| | Agent | Space | Tab |
| --- | --- | --- | --- |
| Shape | slug | prose | prose |
| Charset | `[a-z][a-z0-9_-]{0,31}` | free | free |
| Length cap | 32, enforced | none | none |
| `stripProjectPrefix` | no | yes | no |
| Unique | required | no | no |

Configuration.md documents the agent slug rule properly. What it does not say is
that `stripProjectPrefix` -- described only as dropping a prefix "from the
label" -- applies to the *Space label alone*. Not to tabs, not to agent names.
Someone reading that table has no way to know which of the three surfaces it
touches, and the setting sits in a flat list beside options that apply to all of
them.

Nor does anything say that Space labels are uncapped by design, so the next
person to notice the asymmetry re-derives the measurement in 0037.

## Proposal

A short section in configuration.md, under Templates, carrying the table above.
Fix the `stripProjectPrefix` row to say "the Space label". Note that Space
labels are deliberately uncapped and that clipping is herdr's job, since it is
the surface that knows the column width.

Not a new document. The split is already explained for metadata; this is the
paragraph that says the same split governs the labels.

## Acceptance criteria

- [ ] configuration.md states the per-surface label rules in one place
- [ ] `stripProjectPrefix` says which surface it applies to
- [ ] The absence of a Space label cap is stated as a decision, not an omission
