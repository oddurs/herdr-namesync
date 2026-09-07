---
title: Install
summary: Get namesync running against a live herdr session, and see what it would do before it does anything.
order: 1
---

namesync needs herdr 0.8 or newer and Node 18 or newer. It has no npm
dependencies and nothing to build.

```bash
herdr plugin install oddurs/herdr-namesync
```

## Show it in the sidebar

This step is not optional, and it is the one that catches people out. namesync
publishes `$project`, `$branch`, `$since` and `$n`, but **herdr renders none of
them until the sidebar asks for them.** Install the plugin and nothing visible
changes.

herdr has no `config set` — only `check` and `reset-keys` — so a plugin cannot
make the edit for you. This prints the rows to add:

```bash
namesync setup            # print them
namesync setup --write    # append them, after backing the file up
```

`--write` refuses if you already have `[ui.sidebar.agents]` or
`[ui.sidebar.spaces]`: an existing layout is yours, and it prints what it would
have added instead. On success it backs up `config.toml`, appends, and asks
herdr to reload.

## Local development

For a working copy, link it instead:

```bash
herdr plugin link /path/to/namesync
```

Both register the plugin globally for your user, so it is available in every
herdr session.

## Install the integration for your agent

```bash
herdr integration install claude    # or codex, copilot, cursor, droid, …
```

namesync never asks which agent it is talking to. It reads the title herdr
reports for a pane, so it works with every kind herdr recognises — seventeen at
0.8.2, including Codex, Copilot, Cursor, Devin, Droid, Kimi, OpenCode, Qwen and
Grok. Run `herdr integration status` for the current list.

The integration is herdr's own, not part of namesync, and it is worth having
whichever agent you use. It tells herdr which session each pane holds, which
sharpens the `idle` / `working` / `blocked` states namesync reads before
deciding whether to rename. Without it herdr falls back to screen detection and
reports `unknown` more often — and `unknown` is the one state the policy cannot
act on confidently.

## Look before you leap

The first thing to run is a dry run. It prints every decision namesync would
make against your live session, with the reason for each, and changes nothing:

```bash
namesync dry-run
```

```
rename  agent w5:p1      ""            -> "ptop-adopt-remaining-lessons" | intent changed
rename  workspace w5     "perfect"     -> "ptop-adopt-remaining-lessons" | intent changed
skip    workspace w1     "testing"     -> "Astro docs site GNU style"    | current name was set by hand
skip    workspace w7     "Herdr namer" -> "Herdr namer"                  | name already matches
```

If the skips look right, start the watcher:

```bash
namesync start
```

## What is now running

The herdr startup hook launches a watcher and exits, because herdr startup
hooks are one-shot rather than supervised daemons. The watcher is detached, so
it belongs to neither herdr nor your shell.

It holds a single event subscription and wakes when herdr reports that a pane's
title changed. It reconnects with backoff across herdr restarts and live
handoffs, and the startup hook relaunches it if it is gone.

There is exactly one timer, and only because elapsed time changes without an
event: `$since` needs a clock, since herdr reports state transitions with a
sequence number rather than a timestamp. It ticks every `durationRefreshMs`
(30s by default), and because the buckets are coarse and metadata is
deduplicated, a tick almost always writes nothing. Set `showDuration` to
`false` to remove the timer entirely.

```bash
namesync status   # watcher, config, active sinks, locks
namesync stop     # stop the watcher
```

To remove it completely, stop the watcher and then
`herdr plugin unlink namesync`, so the startup hook does not bring it back.
