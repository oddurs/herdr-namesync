---
id: 74
title: The tests were written to the implementation's convenience
type: bug
status: backlog
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p1
area: test
effort: m
---

## What happens

The llm source could never run on a stale title, and shipped that way for its
entire life. The cause is worth separating from the bug: every costly-source
test built its Namer like this —

    sources: [source, createTitleSource()]

— while `resolveSources` builds `[title, llm]`. With the expensive source first
it answered first, the assertions passed, and the ordering that actually ships
was never exercised. Four tests covered the feature and none of them covered it
in the configuration a user gets.

That is not a missed edge case. The tests were written from inside the
implementation, using whatever wiring made the assertion easy, and they
therefore agreed with the code about something they were both wrong about.

The same shape is likely elsewhere. Candidates worth a pass:

- `buildPlans` tests construct snapshots by hand. Do any of them assemble a
  shape herdr does not actually produce?
- `decide()` is called directly with a fabricated `context`. Is every field
  populated the way `#plan` populates it?
- `resolveSources` filtering — is it tested at all, or only `observe`?
- The sink layer: is `apply` ever exercised through the same path the daemon
  uses, or only called directly?

## What should happen

Audit for tests that build their subject differently from the way production
builds it, and fix the wiring rather than the assertion. Where a test must
construct something by hand, it should construct it with the same function
production uses.

`resolveSources` in particular should appear in at least one test that then
runs `observe` over its output, so the order the user gets is the order under
test.

## Acceptance criteria

- [ ] Every source test that matters runs against `resolveSources` output
- [ ] `buildPlans` fixtures are checked against a real herdr snapshot's shape
- [ ] Any test found agreeing with the code by construction is rewritten
