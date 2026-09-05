---
title: Other multiplexers
summary: Why the same names work in tmux and Ghostty, and how to add a backend.
order: 5
---

The name namesync applies does not come from herdr. It comes from an OSC
terminal title, which every terminal emulator already understands. herdr is
just the first place it gets written to.

That makes the interesting half portable, and it is why the plugin is not
called `herdr-something`.

## herdr

On by default. Names workspaces, tabs and agents. Nothing else about a pane is
touched — not layout, not focus, not its contents.

## tmux

```json
{ "sinks": { "tmux": { "enabled": true, "target": null } } }
```

tmux will not do this on its own. Its `automatic-rename` follows the running
command rather than the pane title, so a window running an agent ends up called
`node`. You can point tmux at the title yourself:

```bash
set -g automatic-rename-format '#{pane_title}'
```

but that gives you the raw title, spinner and all, with none of the policy. The
sink writes the settled name explicitly instead, so the setting above is not
required.

Leave `target` as `null` to rename the active window, or set it to a window id
like `@3` or a `session:window` pair.

## Ghostty, WezTerm, kitty, iTerm2

Nothing to do, for two separate reasons.

An agent running directly in a tab already sets that tab's title itself, over
OSC. namesync is not involved and adds nothing.

When herdr sits in between, herdr drives the host terminal's title from its own
template — so renaming the workspace reaches the tab anyway:

```toml
# ~/.config/herdr/config.toml
window_title = "{workspace} — herdr"
```

Rename the workspace and the Ghostty tab follows, without configuring a sink.

The `osc` sink exists for the opposite case: pushing a chosen name onto a
terminal that is **not** running an agent, by pointing `device` at its tty. It
is off by default because for the common case it would be writing a title that
is already there.

## Adding a backend

A sink is one module in `src/sinks/` exporting three things:

```js
{
  name: 'wezterm',
  available: () => boolean | Promise<boolean>,
  apply: ({ kind, id, label }) => Promise<boolean>,
}
```

`kind` is `workspace`, `tab` or `agent`. Register it in `src/sinks/index.js`
and it will be resolved at runtime whenever `available()` returns true. The
policy, the templates and the locking are all upstream of this, so a new
backend inherits them for free.
