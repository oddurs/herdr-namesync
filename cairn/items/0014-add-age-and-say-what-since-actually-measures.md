---
id: 14
title: Add $age, and say what $since actually measures
type: feature
status: doing
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: s
area: tokens
---

`$since` is time in the *current agent state*, so it resets on every
transition. That makes it right for "who has been blocked longest" and wrong
for "which space has been grinding on the same thing all day" — which is what a
`1d` next to a workspace name looks like it means.

Both questions are worth answering, so answer both:

- `$since` keeps its meaning and the docs say precisely what it is
- `$age` is added: how long the current intent has been current, from the last
  time the name actually changed

Renaming `$since` is out — TOKENS.md says a rename is a breaking change and
adding is safe, and that rule should survive its first test.
