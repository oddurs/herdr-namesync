---
title: Commands
summary: Everything namesync can be asked to do, from the shell or bound to a key in herdr.
order: 3
---

Every command is also a herdr action, so anything here can be run from the
command palette or bound to a key.

## Reading

```bash
namesync status
```

Shows whether the watcher is running, the resolved config and log paths, which
sinks are active, and which workspaces are currently locked.

```bash
namesync dry-run
```

Prints the decision for every target — what it would become, and the reason it
would or would not change. Writes nothing. This is the command to reach for
when a rename surprises you.

## Renaming

```bash
namesync rename-now    # the current workspace
namesync rename-all    # every workspace
```

Both apply the same policy as the watcher, so a locked workspace stays locked
and a settled name stays put. They are for when you do not want to wait out the
debounce.

```bash
namesync reformat
```

Re-renders every label namesync owns, ignoring the similarity gate. Use it
after changing a template or option, when the existing names would otherwise be
declined as "same intent, only reworded". Locked workspaces, hand-edited names,
junk titles and blocked agents are still respected — `reformat` skips the
anti-churn rules, not the safety ones.

## Grouping spaces by project

When several workspaces belong to one repository — a couple of agents on the
same project, or a checkout plus its worktrees — they sit wherever they were
opened, scattered through the sidebar.

```bash
namesync group            # preview
namesync group --apply    # do it
```

Preview is the default because this rewrites your jump keys. herdr derives a
workspace's number from its **position**, and that number is what
`prefix+shift+N` selects, so reordering changes which key goes where. The
preview names every key that moves:

```
  prefix+shift+3 -> prefix+shift+2   fontina  site
```

The trade is worth making once: afterwards a project owns a contiguous block,
so the numbers mean something instead of recording the order you happened to
open things in.

### How the order is chosen

Three properties, or it would not be safe to run:

- **Idempotent.** Running it twice does nothing the second time.
- **Minimal movement.** A project ranks where its *earliest* member already
  sits, so blocks do not jump to the top — only stragglers move. On a session
  whose projects are mostly adjacent, this moves one or two spaces.
- **Predictable.** A project stays roughly where you already expect it.

Within a project the main checkout leads and worktrees follow, mirroring how
herdr nests worktrees it created itself. Spaces with no detected project are
their own group and stay exactly where they are.

A space another plugin has claimed with a `role` token — smali's dashboard, for
instance — keeps its exact position. Furniture should stay where you left it.

It is never automatic. Numbers changing under you while you work would be worse
than the scattering it fixes.

### The Agents panel

Grouping is a Spaces concern. herdr's `ui.agent_panel_sort` chooses whether the
Agents panel follows the Spaces order or sorts by urgency:

```toml
[ui]
agent_panel_sort = "priority"   # or "spaces"
```

Leaving it on `priority` is the recommendation, and it is what makes the two
panels stop duplicating each other: **Spaces answers where things are, grouped
by project; Agents answers what needs you, most urgent first.** Set it to
`spaces` if you would rather have both panels grouped and give up the urgency
ordering.

## Locking

```bash
namesync lock      # pin this workspace's name
namesync unlock    # let it follow the agent again
```

`lock` is rarely needed by hand, because renaming a workspace yourself locks it
automatically. `unlock` is the way back: it clears the lock and forgets that
namesync ever authored the name, so the label becomes adoptable again.

## The watcher

```bash
namesync start
namesync stop
namesync restart
```

`start` is what the herdr startup hook calls. It is a no-op if the watcher is
already running, guarded by a pid file, so it is safe to call repeatedly.

## Binding a key

```toml
[[keys.command]]
key = "prefix+alt+n"
type = "plugin_action"
command = "namesync.rename-now"
description = "rename workspace"
```

Every command that makes sense outside a terminal is registered as an action:
`dry-run`, `rename-now`, `rename-all`, `reformat`, `group`, `lock`, `unlock`,
`status` and `restart` — each qualified with the `namesync.` prefix.

`start`, `stop` and `daemon` are deliberately not actions. Managing the watcher
from inside a herdr menu, while the watcher is what feeds that menu, is a way
to end up confused.
