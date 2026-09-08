# namesync

[![ci](https://github.com/oddurs/herdr-namesync/actions/workflows/ci.yml/badge.svg)](https://github.com/oddurs/herdr-namesync/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Keeps your terminal workspace names in step with the work — and knows when to
leave them alone.

A [herdr](https://herdr.dev) plugin.
**[Documentation](https://oddurs.github.io/herdr-namesync/docs/install)** —
[Install](https://oddurs.github.io/herdr-namesync/docs/install) ·
[How it decides](https://oddurs.github.io/herdr-namesync/docs/deciding) ·
[Configuration](https://oddurs.github.io/herdr-namesync/docs/configuration)

namesync keeps workspace labels, tab labels and agent names in sync with what
the coding agent inside them is actually doing — continuously, and with no LLM
call, API key or account.

It never asks which agent it is talking to. herdr recognises seventeen kinds at
0.8.2 — Claude Code, Codex, Copilot, Cursor, Droid, OpenCode, Qwen and the rest
— and namesync reads whatever herdr reports, so it works with all of them and
with whatever ships next.

## The problem, in one sidebar

Six agents running. herdr can name a space after the directory it was opened in
and not much else, so four of these say where they are and the other two were
typed by hand:

```
  testing          unifont          unifont
  cairn            perfect          milky-xl
```

The directories are also lying. `unifont/` holds **fontina** — twice, two
different checkouts — `perfect/` holds **poptop**, and `milky-xl/` holds
**trafford**. Not one of the six says what is happening inside it.

The same sidebar with namesync publishing into it:

```
 ◑ 1  fontina · main  3m
   testing                                  ← held. Never touched again.
 ◑ 2  fontina · worktree · feat/fixed-pitch-check  1m
   Richard Stallman perspective
 ◑ 3  fontina · main  2m
   Claude Code settings configuration
 ◑ 4  cairn · feat/composition  40m
   cairn                                    ← held
 ◑ 5  poptop · item-0028-disk-saturation  20m
   Ptop adopt remaining lessons
 ✓ 6  trafford · feat/move-and-duplicate  3h
   Terminal Obsidian clone
```

The top line is stable identity: the number is the key that jumps there, the
project is the repository rather than the folder, and the duration is how long
that agent has held its current state. The line underneath is what is happening
right now.

Two of the six are held — someone named them by hand, so namesync will not
touch them again. Every serious plugin in this category does that much; what
namesync adds is that it keeps showing you the cost. A held row publishes
`$locked`, and `status` reports how far the agent has drifted from the name you
froze, so holding one stays a decision rather than becoming a habit.

The words on the second line are the agent's own. namesync did not write them;
it decided where they belong and what shape they should take.

## Why another renamer

herdr's marketplace lists twenty-three plugins that rename things. That is a
fair question to ask before installing a twenty-fourth, so here is the honest
answer.

Almost all of them name a session **once**, from its first prompt, and never
revise it. That is correct for about ten minutes. By the afternoon the label
describes work that finished before lunch — which is the problem this plugin
was built for, not a variation on it.

Three are worth naming, because each is better than namesync at something.

| Instead of | They are better when | namesync is better when |
| --- | --- | --- |
| [herdr-automatic-rename](https://github.com/qu8n/herdr-automatic-rename) names **every** pane — `api › feat/oauth › nvim` — numbers them `[1]`–`[9]`, and a shell hook fires the instant a command starts | You want your shells, ssh sessions and editors named too, not only your agents | Only the agent panes matter to you, and you want their names to keep up with a session that changes subject |
| [herdr-plugin-renamer](https://github.com/wyattjoh/herdr-plugin-renamer) names from the agent's first prompt, renames the worktree's git branch too, and runs on-device via Apple FoundationModels | One session, one task — and you want the branch renamed and nothing leaving the machine | A session that runs all day, where the first prompt stopped describing it hours ago |
| [herdr-tab-smart-rename](https://github.com/iurysza/herdr-tab-smart-rename) names known commands for free and asks a model about the rest, reusing a provider you have already connected in Pi or OpenCode | You want a model interpreting work the agent has not described itself | The agent is already describing its own work, and you want something deciding when to believe it |

All three protect a name you wrote by hand, so that is not the distinction. The
distinction is that namesync moves a name rather than composing one, and that
something decides **when it should change** — a debounce, a rate limit, a
similarity gate, a staleness signal, silence while you are mid-dialog — with
`dry-run` printing the reason behind every decision it makes and every one it
declines.

## Nothing generates the name, unless you ask it to

The work is usually already done. Claude Code, Codex and friends publish a
summary of the current task as their OSC terminal title, and herdr captures it
as `terminal_title_stripped`:

```console
$ herdr agent list | jq -r '.result.agents[].terminal_title_stripped'
Astro docs site GNU style
Richard Stallman perspective
Open source wifi e-reader
```

Free, instant, and it works for every agent kind herdr recognises. So that is
the default, and it needs no model, no key and no account.

Its one weakness is that agents set a title early and rarely revise it. When a
title goes stale namesync notices and says so, rather than pretending
otherwise:

```
 ◑ 3  fontina · main  2m
   Claude Code settings configuration       ← the agent's own title, adopted

 ◑ 3  fontina · main  1h  $stale
   Claude Code settings configuration       ← work moved on; the title has not
```

For the sessions where that is not good enough, an optional `llm` source can
read the pane and write a label. It is off unless you configure an endpoint,
consulted only once the title has demonstrably gone stale, and subject to
exactly the same policy as any other name. Being expensive buys a name no
authority here.

## When it renames

herdr emits `pane.updated` when a pane's stripped title changes, and
deliberately *not* for spinner-only churn. That event is the trigger.
Everything after it is the policy that decides whether to act:

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

Every decline has a reason, and `namesync dry-run` prints all of them without
changing anything. Start there.

Clearing a name hands the workspace back — an empty label is the clearest
possible statement that you did not want the one that was there. `namesync
status` lists what is held, for how long, and how far the agent has drifted
from the frozen name.

## Two surfaces, two shapes

An agent name is an identifier: herdr requires `[a-z][a-z0-9_-]{0,31}` and
unique among live agents. A Space or tab label is prose. The same intent
therefore lands differently depending on where it is going:

| | Agent | Space | Tab |
| --- | --- | --- | --- |
| Shape | slug | prose | prose |
| Length cap | 32, enforced | none | none |
| Project prefix stripped | no | yes | no |
| Unique | required | no | no |

Which is why one title produces two different names. An agent whose title
reads `app-fix-the-auth-flow`, on a project called `app`:

```
agent      app-fix-the-auth-flow      identifier, kept as one
workspace  Fix the auth flow          prose, and the row above already says "app"
```

A title that arrives already slug-shaped is read as prose on the prose
surfaces, so the sidebar does not end up with a hyphenated identifier wearing a
capital letter. One hyphen never triggers it — `well-known` and `read-only` are
words.

Space labels are deliberately uncapped: herdr clips to the column, and it is
the side that knows how wide the column is.

## Install

```bash
herdr plugin install oddurs/herdr-namesync
namesync setup --write            # add the sidebar rows herdr needs
herdr integration install claude  # sharper agent state detection
```

The middle step matters: namesync publishes `$project`, `$branch`, `$since` and
`$n`, but herdr renders none of them until the sidebar asks, and `herdr config`
has no `set` for a plugin to do it with.

So `setup` is as small a guest as it can be. It prints the rows and changes
nothing without `--write`. It backs up your config first. It refuses outright
if you already have a sidebar layout — that one is yours. What it does add is
fenced, so running it twice is a no-op and

```bash
namesync setup --undo
```

takes back exactly what was added, leaving the rest of your config
byte-for-byte as it was.

Requires herdr ≥ 0.8 and Node ≥ 18. No npm dependencies.

## Commands

```bash
namesync status        # watcher, config, active sinks, locks
namesync dry-run       # what would change, and why
namesync rename-now    # this workspace, immediately
namesync rename-all    # every workspace
namesync reformat      # re-render owned labels after a config change
namesync group         # gather a project's spaces together (--apply to do it)
namesync lock          # pin this workspace's name
namesync unlock        # let it follow the agent again
namesync start|stop|restart
```

Each is also a herdr action, so it can be bound to a key:

```toml
[[keys.command]]
key = "prefix+alt+n"
type = "plugin_action"
command = "namesync.rename-now"
description = "rename workspace"
```

`group` is never automatic. herdr numbers workspaces by position and
`prefix+shift+N` follows that number, so reordering rewrites your jump keys —
the preview lists every one that would change.

## Configuration

Copy `config.example.json` to the path printed by `namesync status`. It is
re-read on every decision, so edits apply without a restart. Templates accept
`{intent}`, `{intent-slug}`, `{repo}`, `{branch}`, `{agent}` and `{n}`:

```json
{ "templates": { "workspace": "{repo} · {intent}" } }
```

Every setting is documented on the
[Configuration](https://oddurs.github.io/herdr-namesync/docs/configuration)
page.

## Two lines in the sidebar

herdr sidebar rows hold several lines, and namesync publishes display-only
metadata so each line can carry something different: `$project`, `$branch`,
`$intent`, `$n`, `$worktree`, `$since`, `$age`, `$locked`, `$stale`, `$agent`
and `$agents`.

```toml
[ui.sidebar.agents]
rows = [
  ["state_icon", { token = "$project", fg = "#d3ebe9", bold = true }, { token = "$branch", fg = "#888ba5" }],
  [{ token = "terminal_title_stripped", fg = "#599caa" }],
]
```

The two lines age differently, which is the whole point. Project and branch are
stable identity; the title underneath is whatever the agent is describing right
now. Putting the workspace label on both wastes one of them.

`$project` is the repository's identity, not the folder it sits in — resolved
from the `origin` remote, then the project's own manifest, then the folder,
worktree-aware throughout. Those disagree more often than you would expect.

Agent rows resolve `$name` from **pane** metadata; Space rows resolve it from
**workspace** metadata. namesync publishes both, because a row whose tokens are
all empty is hidden entirely rather than shown blank.

These names are an interface, not implementation detail: herdr's metadata has
no schema or versioning, so a rename breaks a reader silently.
**[TOKENS.md](TOKENS.md) is the contract**, and
[Configuration](https://oddurs.github.io/herdr-namesync/docs/configuration) has
the full table.

## What it cannot do by default

namesync moves a name that already exists. It does not generate one, which
means it inherits whatever the agent publishes.

Coding agents tend to set their terminal title early in a session and not
revise it as the work drifts. When that happens the workspace name is stale and
namesync has nothing newer to propagate — it is mirroring faithfully. Lowering
`similarityThreshold` will not help, because the source has not changed.

This is the main argument for `$project` and `$branch`: they stay true whether
or not the title has moved.

herdr can also send a prompt to a running agent, so namesync could simply ask
one what it is working on and get a perfect answer. It does not, and will not.
That injects into your conversation, spends your tokens and pollutes the
transcript, to fix what is ultimately a cosmetic problem.

## Terminal tabs

Mostly nothing to do — Ghostty, WezTerm, kitty and iTerm2 take their tab title
from the OSC title the program inside sets, and with herdr in between,
`window_title = "{workspace} — herdr"` makes the host tab follow the workspace
namesync renames. tmux is the exception and is not supported. The reasoning is
in [Terminal tabs](https://oddurs.github.io/herdr-namesync/docs/terminals).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The suite runs in under a second and
needs nothing installed:

```bash
node test/run.js
```

The socket has two shapes that cost real debugging time — requests are one per
connection, and a subscribed connection is events-only. Both are written up in
[Internals](https://oddurs.github.io/herdr-namesync/docs/internals) before you
need them.

## License

MIT. See [LICENSE](LICENSE).
