---
title: Configuration
summary: Every setting, what it changes, and the naming templates.
order: 4
---

Configuration lives in one JSON file. Find it with:

```bash
herdr plugin config-dir namesync
```

It is re-read on every decision, so edits take effect without restarting the
watcher.

## Defaults

```json
{
  "enabled": true,

  "debounceMs": 2500,
  "minRenameIntervalMs": 30000,
  "similarityThreshold": 0.6,

  "respectManualNames": true,
  "skipWhileBlocked": true,

  "targets": { "workspace": true, "tab": false, "agent": true },

  "templates": {
    "workspace": "{intent}",
    "tab": "{intent}",
    "agent": "{intent-slug}"
  },

  "multiAgent": "tab",

  "sinks": {
    "herdr": { "enabled": true },
    "tmux": { "enabled": false, "target": null },
    "osc": { "enabled": false, "device": null }
  },

  "logLevel": "info"
}
```

## Settings

| Key | What it changes |
| --- | --- |
| `enabled` | Master switch. `false` leaves every name alone. |
| `debounceMs` | How long a title must hold still before a rename commits. |
| `minRenameIntervalMs` | Floor between two renames of the same workspace. |
| `similarityThreshold` | Token overlap at or above which a new name counts as the same intent. Lower renames more eagerly. |
| `respectManualNames` | Whether a name you wrote is protected. Turning this off is not recommended. |
| `skipWhileBlocked` | Whether to hold off while an agent waits on a dialog. |
| `targets` | Which surfaces get named at all. |
| `multiAgent` | What to do with a workspace holding several agents: `tab`, `focused` or `skip`. |
| `showDuration` | Publish `$since`. This is the only feature that needs a timer; turning it off removes the timer. |
| `durationRefreshMs` | How often to re-check elapsed time. Coarse buckets plus metadata dedup mean a tick usually writes nothing. |
| `stripProjectPrefix` | Drop a leading project name from the label, since the sidebar already shows the project. `ptop-adopt-remaining-lessons` becomes `Adopt-remaining-lessons`. Never strips the whole name. |
| `logLevel` | `error`, `warn`, `info` or `debug`. |

## Templates

Templates accept these tokens:

| Token | Value |
| --- | --- |
| `{intent}` | The agent's title, as written. |
| `{intent-slug}` | The same, slugified for an agent name. |
| `{repo}` | Directory name of the agent's working directory. |
| `{branch}` | Current git branch, resolved only if a template asks for it. |
| `{agent}` | Agent kind, such as `claude` or `codex`. |
| `{n}` | herdr's workspace number. |

To keep the repository visible alongside the intent:

```json
{ "templates": { "workspace": "{repo} — {intent}" } }
```

Agent names are a special case. herdr requires them to match
`[a-z][a-z0-9_-]{0,31}` and to be unique among live agents, so whatever a
template produces is slugified, truncated on a word boundary, and de-duplicated
with a numeric suffix before it is applied.

## Sidebar tokens

namesync publishes display-only metadata to each workspace, which herdr
exposes to the sidebar as `$name` tokens. These are independent of the
workspace label, so a two-line row can carry two different things:

| Token | Value |
| --- | --- |
| `$project` | The repository's name — not the folder name. Resolution order below. |
| `$branch` | Current branch. |
| `$intent` | The agent's live title, before any template is applied. |
| `$n` | The workspace's number — what `prefix+shift+N` jumps to. herdr has no built-in token for this, which is why the sidebar is otherwise not navigable. |
| `$worktree` | The word `worktree` when the agent sits in a linked worktree. Three rows reading `fontina · main` are otherwise identical. |
| `$since` | How long the agent has been in its current state: `now`, `20m`, `3h`, `2d`. Bucketed coarsely so the token changes a handful of times an hour rather than every second. |
| `$agent` | Agent kind, such as `claude`. |
| `$agents` | Number of agents in the workspace, when more than one. |

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

Herdr resolves `$name` from two different places, which is easy to get wrong:

| Panel | `$name` comes from |
| --- | --- |
| Agents | **pane** metadata |
| Spaces | **workspace** metadata |

namesync publishes both, so either panel works. Publishing only one leaves the
other panel's row empty — and herdr hides a row whose tokens are all empty, so
the line silently disappears rather than showing a blank.

Note also that `branch` is a built-in token for Space rows only. Agent rows need
`$branch` from metadata.

```toml
[ui.sidebar.agents]
rows = [
  ["state_icon", { token = "$project", fg = "#d3ebe9", bold = true }, { token = "$branch", fg = "#888ba5" }],
  [{ token = "terminal_title_stripped", fg = "#599caa" }],
]

[ui.sidebar.spaces]
rows = [
  ["state_icon", { token = "$project", fg = "#d3ebe9", bold = true }, { token = "branch", fg = "#888ba5" }, { token = "git_status", fg = "#edb54b" }],
  [{ token = "workspace", fg = "#599caa" }],
]
```

Colour carries the hierarchy rather than repeating it: Gotham `base7` for the
project, mauve for the branch, blue for the live intent underneath.

The point of the split is that the two lines age differently. The project and
branch are stable identity. The title underneath is whatever the agent is
describing right now. Putting the workspace label on both lines wastes one of
them, because namesync sets the label from that same title.

Tokens are republished whenever they change, including when no rename happens
— a project does not stop being true just because the title has not moved.
Turn it off with `"metadata": { "enabled": false }`.
