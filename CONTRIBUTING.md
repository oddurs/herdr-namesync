# Contributing

Thanks for looking. namesync is small on purpose, so most changes are easy to
make and easy to review.

## Getting set up

There is nothing to install. The plugin is dependency-free Node; only the
documentation site has packages.

```bash
git clone git@github.com:oddurs/namesync.git
cd namesync
node test/run.js            # the whole suite, ~1s

herdr plugin link "$PWD"    # run it against a live herdr session
namesync dry-run            # see what it would do, change nothing
```

`herdr plugin link` registers the working directory, so edits take effect on
the next `namesync restart` without reinstalling.

## Working on it

**Start with `dry-run`.** It prints every decision and the reason behind it
without writing anything. Most bug reports resolve to a rule in `src/policy.js`
declining for a reason that is already being printed.

**Keep the layers apart.** They are what make the thing readable:

| File | Owns |
| --- | --- |
| `naming.js` | pure string work — slugs, similarity, junk detection |
| `policy.js` | one function, `decide()`, that says whether to rename |
| `namer.js` | turning a herdr snapshot into plans, and applying them |
| `client.js` | the herdr socket |
| `sources/` | one module per way of observing what an agent is doing |
| `sinks/` | one module per backend |
| `daemon.js` | the event subscription and its lifecycle |

`decide()` is pure and has no I/O. That is deliberate — every branch of the
policy is testable without a herdr session, and it should stay that way.

**Add a test for anything that changes behaviour.** `test/run.js` has no
framework and no dependencies; copy the nearest existing test. Tests must never
read your real config — use `cfg({ ... })`, which builds from defaults.

## Two things worth knowing before you touch the socket

Both cost real debugging time, and both are documented at greater length in
[the internals page](site/src/content/docs/internals.md):

- **Requests are one per connection.** herdr answers and then closes. Sending a
  second request down the same socket gets you an `EPIPE`.
- **A subscribed connection is events-only.** Sending a request down it makes
  the server hang up.

Subscription names use dots (`pane.updated`); the events that come back use
underscores (`pane_updated`).

## Pull requests

- One change per pull request.
- Run `node test/run.js`. CI runs it on Node 18, 20 and 22.
- If you touched the site, `cd site && npm run build`.
- Describe what changed and why. If it is a policy change, say which real
  situation it improves — the rules exist to stop the sidebar churning, and
  loosening one has a cost.

## Reporting a bug

Include the output of:

```bash
namesync status
namesync dry-run
```

Those two together usually contain the answer. If a name changed when you did
not expect it to, the reason string in `dry-run` names the rule responsible.
