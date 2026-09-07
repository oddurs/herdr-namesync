---
id: 17
title: Folder name beat the repo name after a walk-up
type: bug
status: done
milestone: v0.2
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: s
area: project
---

A workspace showed `unifont` where it should have shown `fontina`.

Its agent's foreground directory was a worktree that has since been deleted, so
every git query against that path failed. Detection then walked up the string
path, found the real repository at /Users/oddurs/Code/unifont, and returned its
*folder name* -- without ever asking that directory for its remote.

  findProjectRoot(missing worktree)  ->  /Users/oddurs/Code/unifont
  detectProject(missing worktree)    ->  "unifont"
  detectProject(/Users/oddurs/Code/unifont)  ->  "fontina"

The folder is supposed to be the last resort. Here it short-circuited the whole
chain because the walk-up returned a directory and the caller stopped there.

When the discovered root differs from the directory probed, restart at that
root: remote, then manifest, then its folder name.
