# Changelog

Notable changes to namesync. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- A Space label built from a slug-shaped title kept the slug, so the sidebar
  read `Adopt-remaining-lessons`. `{intent}` on a Space or tab label now reads
  such a title as prose. Agent names are identifiers and are unaffected, and
  `{intent-slug}` still yields a slug wherever it is asked for.

### Changed

- The README, the docs site and `config.example.json` have had a pass for
  publish: examples that predated the prose rule, a clone path that still said
  `namesync` after the repository was renamed, three settings that shipped
  without reaching the example config, and a stale milestone list in
  `AGENTS.md`.
- The test suite runs its async tests four at a time instead of firing all
  fifty at once. It was competing with itself for subprocesses: real `git`
  calls were being killed by their own 3s timeout, and a test asserting the
  first source of a name failed for reasons unrelated to the code. Also three
  times faster.
- Detection tests build their own fixture repository instead of asking the
  namesync checkout about itself, so an assertion says which source answered
  rather than which two happened to agree.

## [0.2.0] — 2026-09-07

Positioning, and the seams. The plugin now says what it actually does — it
keeps a name current rather than generating one — and the places where it met
the operating system rather than herdr have been closed.

### Added

- `status` reports sources alongside sinks, and says why a configured source
  removed itself rather than silently omitting it.
- The `llm` source tells the model which repository it is looking at, using the
  resolved project name rather than the folder.
- Secrets can live in `~/.config/namesync/env`, read at startup so a key
  survives a watcher that herdr launched at login. The environment still wins.
- `sources.llm.maxTokens` (default 64) and an optional `reasoning` passthrough.

- `setup` fences what it writes, so it is idempotent and `setup --undo` takes
  back exactly what it added.

### Fixed

- A reasoning model that spent its whole completion budget thinking used to
  fail silently and look like a plugin that did nothing. It now says so.

### Changed

- The repository is `herdr-namesync`. The command, manifest id and config
  directory are still `namesync`.

## [0.1.0] — 2026-09-06

First release. A herdr plugin that names workspaces, tabs and agents from the
title the coding agent already publishes, with no model call and no API key.

### Added

- **Naming from intent.** Reads the terminal title herdr reports for a pane and
  applies it to the workspace, tab or agent. Works with every agent kind herdr
  detects, not just Claude Code.
- **A policy that decides when to act.** Hand-written names are locked
  permanently; herdr's own defaults are adoptable; rewordings are ignored via a
  stemmed token overlap; renames are debounced and rate limited; a blocked
  agent is left alone; shells, paths and typed commands are never names. Every
  decision prints its reason under `namesync dry-run`.
- **Sidebar metadata** herdr has no tokens for: `$project`, `$branch`,
  `$worktree`, `$intent`, `$since`, `$n`, `$agent`, `$agents`. `$project`
  resolves the repository's identity — origin remote, then any other remote,
  then the project's own manifest, then the folder — because a checkout is
  often named something other than the project it holds.
- **`namesync setup`**, which prints the sidebar rows herdr needs and writes
  them on request. Without this the plugin publishes into a sidebar that never
  renders it.
- **`namesync group`**, which gathers a project's workspaces together.
  Idempotent, minimal-movement, and preview-by-default because herdr numbers
  workspaces by position and those numbers are jump keys.
- **Interop.** A workspace another plugin has claimed with a `role` token is
  never renamed, never written over, and pinned in place when grouping. herdr's
  metadata is one flat map where the last writer wins, so this is the only thing
  standing between two plugins and a silent conflict. See `TOKENS.md`.
- `dry-run`, `status`, `reformat`, `lock`, `unlock`, `restart` — all registered
  as herdr actions.

### Notes

- No dependencies. The plugin is dependency-free Node; only the documentation
  site has packages.
- One timer, and only because herdr reports state transitions with a sequence
  number rather than a timestamp. `showDuration: false` removes it.
- Known ceiling: namesync moves a name, it does not write one. An agent that
  sets its title early and never revises it leaves a stale workspace name, and
  no setting here can fix that. `$project` and `$branch` stay true regardless.
