---
id: 10
title: Ask herdr for state_changed_at
type: chore
status: done
milestone: later
created: 2026-09-06
updated: 2026-09-06
priority: p2
effort: s
area: upstream
---

$since exists only because herdr reports state transitions with a sequence
number and no timestamp, so namesync keeps its own clock and runs the one timer
in the plugin to keep the value honest.

It now has two consumers: namesync publishes it, smali renders it. One field
upstream and both read it directly, the timer goes away, and every other plugin
gets duration for free.

Written up in UPSTREAM.md along with the worktree-grouping gap, which is the
stronger of the two: herdr already groups worktrees it created, and detecting
the rest is a `--git-dir` versus `--git-common-dir` comparison.
