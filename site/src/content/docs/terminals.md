---
title: Terminal tabs
summary: Why your Ghostty, WezTerm or kitty tabs already say the right thing, and what namesync does and does not touch.
order: 5
---

A reasonable question, and the answer is mostly "nothing to do".

## An agent in a terminal tab

Ghostty, WezTerm, kitty and iTerm2 all take their tab title from the OSC title
the program inside sets. A coding agent sets that title itself — it is the same
title namesync reads.

So a tab running Claude Code is already named after the work. namesync is not
involved and adds nothing.

## An agent inside herdr

herdr sits between the agent and the terminal, so it owns the host window's
title and sets it from its own template:

```toml
# ~/.config/herdr/config.toml
window_title = "{workspace} — herdr"
```

`{workspace}` is the workspace label — the thing namesync renames. So renaming
a workspace does reach the host tab, without configuring anything: the tab
follows the focused workspace.

That is the whole integration. There is no sink for it, because there is
nothing to drive.

## tmux

tmux is the one case that does not fall out for free, and namesync does not
handle it.

Its `automatic-rename` follows the *running command*, so a window running an
agent ends up called `node`. You can point it at the title instead:

```bash
set -g automatic-rename-format '#{pane_title}'
```

That gives you the raw title, spinner glyph and all, with none of the policy —
no debounce, no hand-written names protected, no similarity gate.

namesync shipped a tmux sink briefly and it was removed rather than fixed. It
could only rename one window: tmux has no workspace, no tab-with-agent, no
metadata tokens, so every rename in a session landed on the same target and the
last one won. Fixing the targeting would have produced a strictly worse version
of what herdr already does properly.

## Where the boundary falls

Almost everything namesync does is herdr-shaped, and does not port:

| | |
| --- | --- |
| naming a workspace, tab or agent | herdr concepts |
| `$project`, `$branch`, `$since`, `$n` | herdr sidebar metadata |
| grouping spaces by project | herdr workspace ordering |
| the policy — when a name should change | portable, but needs the above to act on |

The sink seam in `src/sinks/` still exists, and a sink still declares which
kinds it can address. If something else ever grows workspaces, agents and a
metadata channel, that is where it would go. Nothing does today.
