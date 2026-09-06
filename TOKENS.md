# Token contract

namesync publishes display-only metadata to herdr. herdr renders it, and
anything else reading a workspace or pane sees it too. This file is what those
names mean and what may be assumed about them.

## Why a contract at all

herdr's metadata is a flat string map with no schema, no ownership and no
versioning. That is the right primitive for herdr to expose and the wrong thing
to depend on informally: a consumer reads `project` by name, and a producer
renaming it breaks that consumer with no error, no missing symbol, and nothing
in a build log. Just a column that stops appearing.

So the names below are treated as an interface rather than as implementation
detail, and the semantics that make them shareable are written down.

## The tokens

Published on both the **workspace** and its **panes**, because herdr resolves
`$name` from workspace metadata for Space rows and from pane metadata for Agent
rows. All values are strings or absent — never empty strings.

| Token | Where | Meaning | Stability |
| --- | --- | --- | --- |
| `project` | both | The repository's name. Origin remote, then any other remote, then the project's own manifest, then the folder. | stable |
| `branch` | both | Current git branch. | stable |
| `worktree` | both | The literal string `worktree` when the pane sits in a linked worktree. Absent otherwise. | stable |
| `n` | both | The workspace's number — what `prefix+shift+N` selects. | stable |
| `intent` | workspace | The agent's live title, before any template is applied. | stable |
| `since` | both | How long the agent has held its current state: `now`, `20m`, `3h`, `2d`. | stable |
| `locked` | both | The literal string `held` when namesync has been told to leave this name alone. Absent otherwise. | stable |
| `stale` | both | The literal string `stale` when the agent has not revised its title across several state transitions. A signal, never acted on. | stable |
| `agent` | both | Agent kind, such as `claude`. | stable |
| `agents` | workspace | Count, only when a workspace holds more than one. Absent otherwise. | stable |

`source` is always `namesync`.

## Rules for consumers

**Degrade, never fail.** Every token can be absent — namesync may not be
installed, may be disabled, or may not have resolved a value yet. Fall back to
what herdr itself knows: a workspace always has a `label`.

**Do not parse `since`.** It is a human-facing bucket, not a duration. If you
need arithmetic you need a timestamp, and herdr does not expose one — see
`UPSTREAM.md`.

**Treat `n` as display, not identity.** It is positional and changes when
spaces are reordered. `workspace_id` is the stable handle.

## The namespace is flat, and last writer wins

`source` is required when publishing, but it is bookkeeping for TTL, sequencing
and clearing — **not** a namespace. Reads return one merged map with no
attribution. Verified against herdr 0.8.2 with a probe key:

```
alpha writes zz_probe=from-alpha   ->  "from-alpha"
beta  writes the same key          ->  "from-beta"     (overwrote it)
beta  clears the key               ->  undefined       (alpha's value gone too)
```

Two plugins writing the same key overwrite each other, and either can clear the
other's value. There is no layering to fall back to.

This matters for generic names. `project` is the obvious thing for any plugin
to publish, and two of them disagreeing about what it means is a silent
conflict rather than an error.

### Claiming a workspace

**A workspace carrying a `role` token is claimed.** namesync leaves it alone
entirely — no rename, no metadata — and **pins it in place** when
`namesync group` reorders spaces. A dashboard or a scratch space is furniture:
you learn where it sits and reach for it there.

`respectPluginRoles: false` opts out of the first part.

If you are writing a plugin that brands a workspace, set `role`. If you are
writing one that names or reorders workspaces, honour it. That convention is
the whole of the interop story, and it is deliberately one key.

## Rules for producers

**Namespace by meaning, not by tool.** These names are generic on purpose:
`project` should mean the same thing whoever publishes it. Something only your
tool understands should be named after your tool, the way `role` is.

**A rename is a breaking change.** There is no deprecation mechanism in a flat
string map. Adding a token is safe; renaming or removing one is not.

## The fragile one

`since` exists only because herdr reports state transitions with a sequence
number rather than a timestamp, so namesync keeps its own clock and runs the
only timer in the plugin to keep the value honest.

If herdr adds `state_changed_at`, every consumer reads that instead, the timer
goes away and this token retires. That is the second request in `UPSTREAM.md`.
