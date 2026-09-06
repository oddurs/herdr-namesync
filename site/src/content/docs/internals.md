---
title: Internals
summary: How namesync talks to herdr, and the four things about that socket worth knowing before you extend it.
order: 6
---

namesync speaks to herdr over its local socket directly rather than shelling
out, because it needs a long-lived event subscription. Four properties of that
socket cost real debugging time, so they are written down here.

## Requests are one per connection

herdr answers a request and then closes the socket. Sending a second request
down the same connection gets you an `EPIPE`.

This is what the herdr CLI does internally, and it is why the client here opens
a fresh connection per call:

```js
class HerdrApi {
  request(method, params) {
    return requestOnce(method, params, { socketPath: this.socketPath });
  }
}
```

## A subscribed connection is events-only

After `events.subscribe`, the socket streams events and stays open — but
sending a request down it makes the server hang up. Subscriptions therefore get
their own dedicated connection, separate from the request path.

## Subscription names and event names differ

You subscribe with dots and receive underscores:

```js
// sent
{ "method": "events.subscribe",
  "params": { "subscriptions": [{ "type": "pane.updated" }] } }

// received
{ "event": "pane_updated", "data": { "pane": { ... } } }
```

An invalid subscription type does not return an error, either. The server
closes the connection, which looks exactly like herdr going away.

## herdr replays a backlog on subscribe

A new subscriber receives the history of a pane's updates, delivered over
several hundred milliseconds, before it catches up to live events.

This one is a genuine trap. An early version of namesync locked workspaces
straight from `workspace_renamed` events, which meant a restart replayed months
of old renames and locked names that had long since changed.

The fix was to stop trusting the event payload. A rename event now only
schedules a resync; the decision to lock is made by comparing the **live**
label against recorded authorship. That is correct no matter when an event
arrives, and it deleted the timing-sensitive code rather than tuning it.

## Not waking yourself up

`pane.updated` fires for scroll position, working directory, agent detection —
and token changes. namesync's own metadata writes are token changes, so
publishing woke the watcher, which synced, which published again.

It was measurable before it was visible: 81 publishes in twenty minutes against
40 possible ticks, arriving in pairs three seconds apart, which is the debounce
interval. The visible symptom was a sidebar that flickered.

The watcher now remembers the last title it saw for each pane and ignores a
`pane.updated` whose title has not changed. That is the only part of that event
it ever cared about.

A related cost is worth knowing about when adding a token: every value that
changes is a write and a redraw, multiplied by the number of agents. `$since`
steps rather than ticking for exactly this reason — a minute counter across ten
agents is ten redraws a minute for a number nobody reads that precisely.

## Exactly one watcher

The pid file is ownership, not just a record. A watcher re-reads it on every
sync, and a watcher that finds someone else's pid there stands down:

```
[warn] superseded by watcher pid 88366; standing down
[info] stopped
```

Preventing duplicates is not sufficient on its own. `restart` used to unlink the
pid file and then wait a fixed 200ms, so a slow shutdown left the old watcher
alive while a new one started beside it — two processes writing one `state.json`.
Restart now waits for the previous pid to actually disappear, but an orphan
created before that fix has no way to learn it should stop. Self-eviction is
what makes the invariant hold retroactively.

## Cross-platform

`net.connect({ path })` handles both Unix domain sockets and Windows named
pipes with one code path, so none of the above needs platform branching. The
whole plugin is dependency-free Node, which is what keeps macOS, Linux and
Windows on the same implementation.

## Tests

```bash
node test/run.js
```

Covers the slug rules, the stemmed similarity gate, every branch of the policy,
the junk-title cases taken from a live event stream, and the multi-agent
fallback.
