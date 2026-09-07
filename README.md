# namesync

[![ci](https://github.com/oddurs/herdr-namesync/actions/workflows/ci.yml/badge.svg)](https://github.com/oddurs/herdr-namesync/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Names your terminal workspaces after what you are actually doing in them.

A [herdr](https://herdr.dev) plugin.
**[Documentation](https://oddurs.github.io/herdr-namesync/docs/install)** —
[Install](https://oddurs.github.io/herdr-namesync/docs/install) ·
[How it decides](https://oddurs.github.io/herdr-namesync/docs/deciding) ·
[Configuration](https://oddurs.github.io/herdr-namesync/docs/configuration)

A herdr plugin that keeps workspace labels, tab labels and agent names in sync
with the intent of the coding agent running inside them — continuously, without
an LLM call or an API key.

It never asks which agent it is talking to. herdr recognises seventeen kinds —
Claude Code, Codex, Copilot, Cursor, Droid, OpenCode, Qwen and the rest — and
namesync reads whatever herdr reports, so it works with all of them and with
whatever ships next.

Six agents running. herdr on its own names each space after the directory it
was opened in, which is how three of these end up identical:

```
  unifont          unifont          unifont
  astralia         perfect          bedreader
```

The same sidebar with namesync publishing into it:

```
 ✓ 1  fontina · main  10m
   Astro docs site GNU style
 ✓ 2  fontina · worktree · feat/packaging-manifests  1d
   Richard Stallman perspective
 ✓ 3  fontina · main  2h
   Claude Code settings configuration
 ◑ 4  cairn · docs/the-rules  8m
   Open source project roadmap CLI
 ◑ 5  ptop · item-0014-persist-history  45m
   ptop-adopt-remaining-lessons
 ◑ 6  bedreader · feat/prepare  3m
   Open source wifi e-reader
```

Three of those directories are lying: `unifont/` holds **fontina**, `astralia/`
holds **cairn**, `perfect/` holds **ptop**. The number is the key that jumps
there, the second row shows it is a worktree rather than a fourth clone, and
the duration is how long that agent has been sitting in its current state.

The bottom line of each pair is the agent's own title — namesync never wrote
it, it only moved it somewhere useful.

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
herdr plugin install oddurs/herdr-namesync
namesync setup --write            # add the sidebar rows herdr needs
herdr integration install claude  # sharper agent state detection
```

The middle step matters: namesync publishes `$project`, `$branch`, `$since` and
`$n`, but herdr renders none of them until the sidebar asks. `setup` prints the
rows, and `--write` appends them after backing up your config. It refuses if
you already have a sidebar layout — that one is yours.

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
5. **The folder name.** Genuinely last. A directory found by walking up is
   asked the same questions from the top, so a deleted worktree still reports
   the repository it belonged to rather than the folder above it.

These names are an interface, not implementation detail: herdr's metadata has
no schema or versioning, so a rename breaks a reader silently.
[TOKENS.md](TOKENS.md) is the contract.

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

## What it cannot do by default

namesync moves a name that already exists. It does not generate one, which
means it inherits whatever the agent publishes.

Coding agents tend to set their terminal title early in a session and not
revise it as the work drifts. When that happens the workspace name is stale and
namesync has nothing newer to propagate — it is mirroring faithfully. Lowering
`similarityThreshold` will not help, because the source has not changed.

This is the main argument for `$project` and `$branch`: they stay true whether
or not the title has moved.

For the sessions where that is not enough, an optional `llm` source can read
the pane and write a label — off unless you configure an endpoint, consulted
only once the title has demonstrably gone stale, and subject to exactly the
same policy as any other name. See
[Where names come from](site/src/content/docs/sources.md).

## Terminal tabs

Mostly nothing to do. Ghostty, WezTerm, kitty and iTerm2 take their tab title
from the OSC title the program inside sets, and a coding agent sets that itself
— so a tab running Claude Code is already named after the work, with namesync
uninvolved.

With herdr in between, herdr owns the host window's title and sets it from its
own template:

```toml
# ~/.config/herdr/config.toml
window_title = "{workspace} — herdr"
```

`{workspace}` is the label namesync renames, so the host tab follows the
focused workspace without configuring anything.

tmux is the exception and namesync does not handle it — its `automatic-rename`
follows the running command rather than the title. A tmux sink shipped briefly
and was removed rather than fixed: tmux has no workspace, no agent and no
metadata tokens, so every rename landed on one window and the last one won.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The suite runs in about a second and
needs nothing installed:

```bash
node test/run.js
```

## License

MIT. See [LICENSE](LICENSE).
