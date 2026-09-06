# Token contract

namesync publishes display-only metadata to herdr. Other tools read it. This
file is the contract between them, because right now that contract is implied
by string literals in two codebases and nothing else.

## Why this exists

smali reads five namesync tokens by exact name:

```rust
// smali/src/herdr.rs
self.tokens.get("project").unwrap_or(&self.label)
self.tokens.get("branch")
self.tokens.get("intent")
self.tokens.get("since")
self.tokens.get("n")
```

That is a real dependency — it is what produces `▸ 1 fontina 6h` in smali's
spaces panel and `+ 7 namesync — …` in its brief. Neither repository declared
it. Renaming `since` here would degrade smali silently: no error, no missing
symbol, just a column that stops appearing.

herdr's token mechanism has no schema, no ownership and no versioning. A flat
string map is exactly the right primitive for herdr to expose, and exactly the
wrong thing to depend on without writing the contract down.

## Where each piece sits

| | Owns | Reads |
| --- | --- | --- |
| **herdr** | panes, workspaces, tabs, agent detection, the sidebar, the socket API | — |
| **namesync** | naming, and identity metadata | herdr snapshots and events |
| **smali** | presentation: dashboard, views, status line | herdr, namesync tokens, cairn, ptop |
| **cairn** | work items and roadmap | its own store |
| **ptop** | system metrics | the machine |

The rule that keeps this from tangling: **one producer per fact.** namesync is
the only thing that decides what a project is called. smali never recomputes
it, and does not shell out to git — verified, it contains no git invocations at
all. ptop owns CPU. cairn owns work items. A consumer that finds itself
recomputing another tool's fact has found a missing token, not a reason to
duplicate.

## The tokens

Published on both the **workspace** and its **panes**, because herdr resolves
`$name` from workspace metadata for Space rows and from pane metadata for Agent
rows. All values are strings or absent — never empty strings.

| Token | Where | Meaning | Stability |
| --- | --- | --- | --- |
| `project` | both | The repository's name. Origin remote, then the project's own manifest, then the folder. | stable |
| `branch` | both | Current git branch. | stable |
| `worktree` | both | The literal string `worktree` when the pane sits in a linked worktree. Absent otherwise. | stable |
| `n` | both | The workspace's number — what `prefix+shift+N` selects. | stable |
| `intent` | workspace | The agent's live title, before any template is applied. | stable |
| `since` | both | How long the agent has held its current state: `now`, `20m`, `3h`, `2d`. | stable |
| `agent` | both | Agent kind, such as `claude`. | stable |
| `agents` | workspace | Count, only when a workspace holds more than one. Absent otherwise. | stable |

`source` is always `namesync`.

### Rules for consumers

**Degrade, never fail.** Every token can be absent — namesync may not be
installed, may be disabled, or may not have resolved a value yet. smali's
`unwrap_or(&self.label)` is the right shape: fall back to what herdr itself
knows.

**Do not parse `since`.** It is a human-facing bucket, not a duration. If you
need arithmetic you need a timestamp, and herdr does not expose one yet — see
`UPSTREAM.md`.

**Treat `n` as display, not identity.** It is positional and changes when
spaces are reordered. `workspace_id` is the stable handle.

### Rules for producers

**Namespace by meaning, not by tool.** These names are generic on purpose:
`project` should mean the same thing whoever publishes it. A tool publishing
something only it understands should prefix it — smali publishes `role`, which
is smali's own concept and is named as such.

**A rename is a breaking change.** There is no deprecation mechanism in a flat
string map. Adding a token is safe; renaming or removing one is not.

## What this implies

Three things follow from writing it down, none of them large:

1. **smali should say what it consumes.** A short section in its README
   pointing here, so the dependency is discoverable from either end.
2. **namesync should not rename a token without checking.** This file is the
   list to check against.
3. **`since` is the fragile one.** It exists only because herdr reports state
   transitions with a sequence number rather than a timestamp, so namesync
   keeps a clock to synthesise it. If herdr adds `state_changed_at`, both
   tools should read that instead and this token should be retired — which is
   the second issue in `UPSTREAM.md`, and now has a second consumer arguing
   for it.
