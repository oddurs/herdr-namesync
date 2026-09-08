---
id: 75
title: Nothing tests the socket contract
type: feature
status: backlog
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p1
area: client
effort: m
---

## Problem

Four things about herdr's socket cost real debugging time, and all four are
recorded in prose:

- a request gets one connection; a second down the same socket is an `EPIPE`
- a subscribed connection is events-only; a request down it makes the server
  hang up
- subscription names use dots, the events that come back use underscores
- herdr replays a backlog on subscribe, so early renames must be ignored until
  the first sync

`internals.md` explains them, `CONTRIBUTING.md` repeats two, and `client.js`
comments the rest. Not one is asserted anywhere. The suite is 138 tests against
hand-built snapshot objects and never opens a socket.

These are exactly the constraints a herdr upgrade changes, and the failure mode
is not a red test — it is a watcher that connects, subscribes, and then quietly
stops renaming anything.

The plugin declares `min_herdr_version = "0.8.0"` and the notes cite behaviour
"measured against 0.8.2". Both are observations someone made once, by hand.

## Proposal

A stub server speaking the same shape: accept a connection, answer one request,
close. Accept a subscription, stream events, hang up on a request. Emit
`pane_updated` for a subscription to `pane.updated`. Replay a backlog on
connect.

Then assert that `HerdrApi` reconnects per call, that `HerdrEvents` holds its
own connection, that the name translation is applied in both directions, and
that the daemon ignores replayed renames before its first sync.

A stub cannot prove herdr still behaves this way. It can prove *we* still
expect it to, which is what turns a silent regression into a failing test the
day someone edits the client.

Worth considering separately: a thin smoke test against a real herdr when one
is present, skipped otherwise. That is the only thing that would catch herdr
changing underneath us, and it cannot run in CI.

## Acceptance criteria

- [ ] A stub server exercising all four behaviours
- [ ] `HerdrApi` and `HerdrEvents` tested against it
- [ ] Backlog suppression before first sync is asserted
- [ ] The stub is small enough that nobody is tempted to mock it instead
