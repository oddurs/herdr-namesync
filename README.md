# namesync

[![ci](https://github.com/oddurs/namesync/actions/workflows/ci.yml/badge.svg)](https://github.com/oddurs/namesync/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Names your terminal workspaces after what you are actually doing in them.

A [herdr](https://herdr.dev) plugin. Full documentation lives in
[`site/src/content/docs`](site/src/content/docs) — start with
[Install](site/src/content/docs/install.md), then
[How it decides](site/src/content/docs/deciding.md).

A herdr plugin that keeps workspace labels, tab labels and agent names in sync
with the intent of the coding agent running inside them — continuously, without
an LLM call or an API key.

```
before                          after
────────────────────────        ─────────────────────────────────
w4  cairn                       w4  Open source project roadmap CLI
w5  perfect                     w5  ptop-adopt-remaining-lessons
w6  bedreader                   w6  Open source wifi e-reader
```

## Why this exists

Every other renamer generates a name: it calls a model with your first prompt,
or shells out to an on-device summariser, or asks you for an `OPENAI_API_KEY`.

That work is already done. Claude Code, Codex and friends continuously publish a
summary of the current task as their OSC terminal title, and herdr already
captures it as `terminal_title_stripped`:

```console
$ herdr agent list | jq -r '.result.agents[].terminal_title_stripped'
Astro docs site GNU style
Richard Stallman perspective
Open source wifi e-reader
```

So the interesting problem is not *generating* an intent name. It is deciding
**when a name should change**, and propagating it to every surface that shows
one. That is all this plugin does.

## When it renames

herdr emits `pane.updated` when a pane's stripped title changes, and
deliberately *not* for spinner-only churn. That event is the trigger. Everything
after it is the policy that decides whether to act:

| Rule | Behaviour |
| --- | --- |
| Hand-written names win | If a label is not the one this plugin last wrote, a human wrote it. It is locked and never touched again. |
| herdr defaults are adoptable | `unifont`, `w3`, `tab 2`, empty — nobody chose these, so they get claimed. |
| Rewordings are not new intent | "naming plugin" → "naming plugins" scores 1.0 on a stemmed token overlap and is skipped. |
| Settle before committing | Titles churn early in a turn; a rename waits `debounceMs` for the intent to hold still. |
| One rename per workspace per interval | `minRenameIntervalMs` stops a fast session strobing the sidebar. |
| Silence while blocked | When an agent sits on an approval dialog its title describes the question, not the work. |
| No guessing across agents | A workspace holding two agents has no single intent, so tabs get named instead of the workspace. |
| Junk is never a name | Shells, bare paths and the plain repo name are rejected. |

`node src/cli.js dry-run` prints every decision and its reason without changing
anything. Start there.

## Install

```bash
herdr plugin install <owner>/namesync     # or, for local development:
herdr plugin link /path/to/namesync
herdr integration install claude                 # sharper agent state detection
```

Requires herdr ≥ 0.8 and Node ≥ 18. No npm dependencies.

The startup hook launches a watcher and exits, per herdr's one-shot hook
contract. The watcher holds one socket subscription and reconnects with backoff
across herdr restarts and live handoffs.

## Commands

```bash
node src/cli.js status        # watcher, config, active sinks, locks
node src/cli.js dry-run       # what would change, and why
node src/cli.js rename-now    # this workspace, immediately
node src/cli.js rename-all    # every workspace
node src/cli.js lock          # pin this workspace's name
node src/cli.js unlock        # let it follow the agent again
node src/cli.js restart       # restart the watcher
```

They are also herdr actions, so they can be bound to keys:

```toml
[[keys.command]]
key = "prefix+alt+n"
type = "plugin_action"
command = "namesync.rename-now"
description = "rename workspace"
```

## Configuration

Copy `config.example.json` to the path printed by
`herdr plugin config-dir namesync` (or `node src/cli.js status`). It is
re-read on every decision, so edits apply without a restart.

Templates accept `{intent}`, `{intent-slug}`, `{repo}`, `{branch}`, `{agent}`
and `{n}`:

```json
{ "templates": { "workspace": "{repo} · {intent}" } }
```

Agent names are always slugified to herdr's `[a-z][a-z0-9_-]{0,31}` rule and
de-duplicated against live agents.

## How it talks to herdr

Two connection shapes, because herdr treats them differently. Both are worth
knowing before extending this:

- **Requests are one per connection.** herdr answers a request and then closes
  the socket. `HerdrApi` reconnects per call, which is what the herdr CLI does
  internally. Reusing one socket for a second request gets you an `EPIPE`.
- **A subscribed connection is events-only.** After `events.subscribe` the
  socket streams events and stays open, but sending a request down it makes the
  server hang up. `HerdrEvents` therefore holds its own connection.
- **Event names differ from subscription names.** You subscribe to
  `pane.updated` and receive `{"event":"pane_updated","data":{...}}`.
- **herdr replays a backlog on subscribe.** The watcher ignores rename events
  until its first sync has run, so old renames are not mistaken for live edits.

`net.connect({ path })` handles both Unix sockets and Windows named pipes, so
none of this needs platform branching.

## Two lines in the sidebar

herdr sidebar rows can hold several lines, and namesync publishes display-only
metadata so each line can carry something different:

| Token | Value |
| --- | --- |
| `$project` | The repository's name — not the folder name. Resolution order below. |
| `$branch` | Current branch. |
| `$intent` | The agent's live title, before templating. |
| `$n` | Workspace number — what `prefix+shift+N` jumps to. herdr has no built-in token for it. |
| `$worktree` | `worktree` when the agent sits in a linked worktree. |
| `$since` | How long the agent has been in its current state — `now`, `20m`, `3h`. |
| `$agent` / `$agents` | Agent kind, and a count when a workspace holds more than one. |

Agent rows resolve `$name` from **pane** metadata; Space rows resolve it from
**workspace** metadata. namesync publishes both, because a row whose tokens are
all empty is hidden entirely rather than shown blank.

```toml
[ui.sidebar.agents]
rows = [
  ["state_icon", { token = "$project", fg = "#d3ebe9", bold = true }, { token = "$branch", fg = "#888ba5" }],
  [{ token = "terminal_title_stripped", fg = "#599caa" }],
]
```

`$project` is the repository's identity, not the folder it sits in. Those
disagree more often than you would expect: a checkout named `unifont/` can hold
`fontina`, `perfect/` can hold `ptop`, `astralia/` can hold `cairn`.

Resolved in this order, first answer wins:

1. **The `origin` remote.** `git@github.com:oddurs/fontina.git` gives
   `fontina` — the canonical name of the repository, however it was cloned.
2. **What the project declares about itself.** `package.json` `name` (npm scope
   stripped), `Cargo.toml`, `pyproject.toml`, `deno.json`, or the last segment
   of a `go.mod` module path.
3. **The repository root's folder name.** Worktree-aware: a linked worktree
   reports the repo it belongs to, not the worktree directory.
4. **The nearest project marker.** For directories that are not git
   repositories, walks up looking for `package.json`, `Cargo.toml`, `go.mod`
   and friends, stopping at `$HOME`.
5. **The folder name.** Last resort.

The two lines age differently. Project and branch are stable identity; the
title underneath is whatever the agent is describing right now. Putting the
workspace label on both wastes one of them, since namesync sets that label from
the same title.

## Grouping spaces by project

```bash
namesync group            # preview
namesync group --apply    # do it
```

Gathers a repository's workspaces together — several agents on one project, or
a checkout and its worktrees. Preview is the default: herdr numbers workspaces
by position and `prefix+shift+N` follows that number, so the preview lists every
jump key that would change.

Idempotent, and deliberately minimal-movement — a project ranks where its
earliest member already sits, so blocks do not jump to the top. Never automatic.

## What it cannot do

namesync moves a name that already exists. It does not generate one, which
means it inherits whatever the agent publishes.

Coding agents tend to set their terminal title early in a session and not
revise it as the work drifts. When that happens the workspace name is stale and
namesync has nothing newer to propagate — it is mirroring faithfully. Lowering
`similarityThreshold` will not help, because the source has not changed.

This is the main argument for `$project` and `$branch`: they stay true whether
or not the title has moved.

## Other multiplexers

The intent source is an OSC terminal title, which is universal. Sinks are
pluggable — one module each in `src/sinks/`, resolved at runtime by what is
available:

- **herdr** — workspace, tab and agent names. On by default.
- **tmux** — window names. tmux's own `automatic-rename` follows the running
  command rather than the title, so this sink writes the name explicitly.
  Enable it under `sinks.tmux`.
- **Ghostty, WezTerm, kitty, iTerm2** — nothing to do, for two separate
  reasons. An agent running directly in a tab already sets that tab's title
  itself, via OSC. And when herdr is in between, herdr's own `window_title`
  template drives the host terminal, so a renamed workspace reaches the tab
  anyway:

  ```toml
  # ~/.config/herdr/config.toml
  window_title = "{workspace} — herdr"
  ```

  The `osc` sink exists only for the remaining case: pushing a name onto a
  terminal that is *not* running an agent, by pointing `device` at its tty.

Adding a backend means adding a module to `src/sinks/` that exports
`{ name, available(), apply({ kind, id, label }) }`. Nothing else changes.

Pure Node with no native deps, so macOS, Linux and Windows all work; the socket
client uses `net.connect({ path })`, which covers both Unix sockets and Windows
named pipes.

## Tests

```bash
node test/run.js
```

Covers slug rules, the stemmed similarity gate, every policy branch, and the
multi-agent fallback.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The suite runs in about a second and
needs nothing installed:

```bash
node test/run.js
```

## License

MIT. See [LICENSE](LICENSE).
