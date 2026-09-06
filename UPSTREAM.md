# Upstream notes for herdr

Five things namesync ran into. Two would be better solved in herdr, one is a
gap any metadata plugin will hit, and two it works around fine. Written up so they can be filed as issues; all four were
found while building against herdr 0.8.2.

---

## 1. Worktree grouping is provenance-gated rather than detected

**herdr already has this feature.** From the docs: `New worktree` "opens the
checkout as a new Herdr workspace and groups it under the source workspace",
and the Space panel indents and packs those children as one group.

But the grouping only happens for worktrees herdr created itself. A checkout
opened as an ordinary workspace carries no worktree provenance, so it renders
as an unrelated top-level row:

```console
$ herdr api snapshot | jq '.result.snapshot.workspaces[] | select(.workspace_id=="w2")'
{ "workspace_id": "w2", "label": "m5", ... }        # no worktree field

$ git -C ~/Code/unifont worktree list
/Users/oddurs/Code/unifont                    54b3b87c [main]
/Users/oddurs/Code/unifont/.claude/worktrees/…  349630ef [test/agent-and-activation]
```

Git knows. herdr does not ask.

The result is three sidebar rows reading `fontina · main`, `fontina · main` and
`fontina · feat/packaging-manifests` with no visible relationship, even though
one is a linked worktree of another.

**Suggested fix.** When a workspace opens, compare `git rev-parse --git-dir`
with `--git-common-dir`. If they differ it is a linked worktree; the common dir
identifies the parent repo, so an already-open workspace on that repo can adopt
it into the existing group. This is a few milliseconds per workspace open and
reuses UI that already ships.

**Why it matters.** This is the single highest-value change of the four: no new
concept, no new configuration, and it makes an existing feature work for people
who create worktrees with `git worktree add` rather than through herdr.

---

## 2. Agent state has a sequence number but no timestamp

`agent.list` and `session.snapshot` report `state_change_seq`, a monotonic
counter. There is no wall-clock for when a pane entered its current state.

So "blocked for 12 minutes" — arguably the most useful thing to know when
several agents are running — cannot be derived by any client. The only way to
show it is to observe every transition yourself and keep a private clock, which
means holding state that herdr already has, and running a timer to keep the
displayed value honest.

namesync does exactly that, and it is the only timer in the plugin.

**Suggested fix.** Add `state_changed_at` (epoch milliseconds) alongside
`state_change_seq` on agent and pane records. Every client that wants duration
then gets it for free, and none of them need a clock.

A `$state_age` sidebar token would be a natural follow-on, but the field alone
is enough — the rest can live in plugins.

---

## 3. A plugin cannot configure the surface it publishes into

`herdr config` offers `check` and `reset-keys`. There is no `set`, and no
socket method that writes config, so a plugin has no way to add the sidebar
rows that would render what it publishes.

The effect is that installing a metadata plugin changes nothing visible.
namesync publishes `$project`, `$branch`, `$since` and `$n`; herdr draws none
of them until someone hand-edits `[ui.sidebar.agents]` and
`[ui.sidebar.spaces]`. A new user installs the plugin, sees an unchanged
sidebar, and concludes it does not work.

namesync now ships `namesync setup --write`, which appends the blocks to
`config.toml` after backing it up and then calls `server.reload_config`. That
works — `herdr config check` validates the result — but every metadata plugin
will have to write its own TOML appender, and each one is a chance to corrupt
a config file that is not theirs.

**Suggested fix**, in rough order of how much would be needed:

- a documented way for a plugin to *suggest* rows, which herdr merges at render
  time and the user can accept or ignore; or
- `herdr config set <key> <value>` with the same validation `config check`
  already performs, so plugins do not each reimplement TOML editing.

Neither is urgent. But the current state means the value of a metadata plugin
is invisible on install, which is the worst moment for it to be invisible.

## 4. No index token for the sidebar (worked around)

The Space panel cannot show a workspace's own number, so it cannot show what
`prefix+shift+N` jumps to. `workspace.number` is in the snapshot; the sidebar
token list has no equivalent.

The panel therefore describes the session accurately while remaining
un-navigable: you read intent lines to find the space you want, then guess the
index.

namesync publishes `$n` as workspace metadata, which resolves it. A built-in
`number` token for Space rows (and the agent's owning workspace number for
Agent rows) would mean plugins did not have to.

---

## 5. Agent rows cannot read workspace metadata (worked around, and correct)

Space rows resolve `$name` from workspace metadata; Agent rows resolve it from
pane metadata. This follows from the model — an agent is a recognition of a
process inside a pane, not a durable entity, so it has nowhere of its own to
store anything.

The consequence is that a plugin wanting the same token on both panels must
publish it twice, to two different stores, and keep them in step. namesync does.

This is arguably correct as designed rather than a bug. If anything is wanted
here, it is for Agent rows to be able to reference their owning workspace's
metadata — perhaps `$workspace.name` — so that durable, per-project values are
published once.

---

## Not a gap: the two panels

Worth recording, because it looked like duplication at first.

Space rows and Agent rows render nearly the same information in a session where
every workspace holds exactly one pane with exactly one agent. At 1:1:1 the
container and the observation collapse onto each other.

They diverge as soon as the cardinality does — several agents in a workspace, a
workspace with no agent, or several workspaces on the same repo. The split is
right; it just is not visible in the simple case.

---

## Filing

Ready to go as two issues, in this order:

```bash
gh issue create --repo herdrdev/herdr \
  --title "Detect worktrees herdr did not create, so they group like the ones it did"

gh issue create --repo herdrdev/herdr \
  --title "Expose state_changed_at alongside state_change_seq"
```

The worktree one is the stronger of the two: the grouping UI already ships, and
the detection is a `--git-dir` versus `--git-common-dir` comparison. The
timestamp one is smaller in scope but removes a timer from every client that
wants to show how long an agent has been stuck.

Section 3 is worth raising too, though it is a design question rather than a
missing field, and is better asked than proposed.
