# Changelog

Notable changes to namesync. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

First release.

### Added

- Names herdr workspaces, tabs and agents from the terminal title the coding
  agent already publishes, with no model call and no API key.
- A policy that decides *when* a name should change: hand-written names are
  locked permanently, herdr's own defaults are adoptable, rewordings are
  ignored via a stemmed token overlap, renames are debounced and rate limited,
  and a blocked agent is left alone.
- Sidebar metadata: `$project`, `$branch`, `$worktree`, `$intent`, `$since`,
  `$n`, `$agent`, `$agents`. `$project` resolves the repository's identity —
  origin remote, then the project's own manifest, then the folder — because a
  checkout is often named something other than the project it holds.
- `namesync group`, which gathers a project's workspaces together. Idempotent,
  minimal-movement, and preview-by-default because herdr numbers workspaces by
  position and those numbers are jump keys.
- Pluggable sinks: herdr, tmux, and raw OSC titles.
- `dry-run`, `status`, `reformat`, `lock`, `unlock`.
