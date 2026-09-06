---
id: 4
title: Make the sidebar work on install without hand-editing config
type: feature
status: doing
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: m
area: adoption
---

This is the adoption barrier. namesync publishes $project, $branch, $since and
$n, but herdr renders nothing new until the user edits `[ui.sidebar.agents]`
and `[ui.sidebar.spaces]` in config.toml by hand. A stranger installs the
plugin, sees no change, and concludes it does not work.

`herdr config` offers only `check` and `reset-keys` — there is no `set`, so a
plugin cannot apply this itself. Confirmed against 0.8.2.

So the fix is a command that makes the edit obvious and safe:

- `namesync setup` prints the exact TOML blocks for both panels
- `--write` appends them to config.toml after backing it up, then runs
  `herdr server reload-config`
- refuse to write if the keys already exist; print a diff instead
- register it as a plugin action so it is reachable from the palette

Mention it in the first paragraph of Install, not further down.
