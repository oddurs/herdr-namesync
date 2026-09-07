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

## Sources and sinks

Two seams, deliberately symmetric.

A **sink** knows how to apply a name without knowing why it was chosen. A
**source** knows how to observe what an agent is working on without knowing
what will be done with the answer. `Namer` sits between them and owns the
policy, which is the only place anything is decided.

```js
// src/sources/
{ name, available(), observe({ agent, pane, client }) -> string | null }

// src/sinks/
{ name, kinds, available(), apply({ kind, id, label }) -> boolean }
```

Sources are consulted in order and the first real answer wins, so a fallback
chain costs nothing while the cheap source is working. `title` — the agent's
own terminal title — is free, works with every agent kind herdr detects, and is
the default.

The rule that makes the seam safe: **whatever a source returns goes through the
same policy as anything else.** Holds, the similarity gate, the debounce, the
rate limit. No name earns authority by being expensive to obtain, which is what
allows an unreliable or costly source to be added later without it being able
to churn the sidebar.

A source that throws is skipped and logged rather than allowed to stop the
sync. One observation failing is not a reason to stop naming everything else.

### When a costly source is worth asking

A source may declare itself `costly` — slow, metered, or both. Those are
consulted only when three things hold at once:

- **stale** — the title has survived several state transitions unchanged,
  which is namesync's own evidence that the free source has failed
- **settled** — the agent is not mid-turn, so the pane shows a finished result
  rather than something half-written
- **not recent** — a floor per pane, or a session that finishes repeatedly
  while genuinely stale would bill in a loop

Finishing alone is not enough. A title survives completions unchanged, which is
how staleness is measured in the first place.

The floor is charged only when a costly source is actually consulted, so a
cheap answer never postpones the next real attempt.

### Reading a pane, and what it is worth

herdr can read a pane, so the obvious next source is "look at what the agent is
actually doing". It was built, measured against the titles it would replace,
and lost every case:

```
"Astro docs site GNU style"        ->  ".worktrees feat narrow by"
"Open source project roadmap CLI"  ->  "Code astralia"
"ptop-adopt-remaining-lessons"     ->  "Code perfect"
"Richard Stallman perspective"     ->  null
```

Two of six produced nothing at all, and `Code astralia` is a parent directory
plus a folder name that is not even the project — that repository is `cairn`.
**A screenful yields a location, not an intent.** So it is not a source: a
thing that cannot answer the question should not implement the interface that
asks it.

What survives is `src/viewport.js`, the reading and cleaning — chrome, rulers
and the spinner removed — which is exactly the input something that *can*
summarise would need.

Two details worth keeping:

- the **status line is chrome by appearance but carries the one durable fact**
  on screen, so location is parsed from the raw lines before cleaning removes
  it
- the spinner is matched **by shape, not by glyph**. Claude Code cycles through
  more sparkle characters than is practical to enumerate; an earlier version
  listed five and missed the sixth. A word ending in an ellipsis followed by a
  parenthesised duration is stable

### One answer per agent per pass

`#vars` runs more than once for the same agent — once for its own name, again
for the workspace it leads. Each run used to resolve git and consult sources
afresh. That is wasted work, and with a costly source it is worse than wasted:
the first call charges the floor and the second falls back, so a single sync
produced two different answers for one agent. Results are now memoised for the
duration of a pass.

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
