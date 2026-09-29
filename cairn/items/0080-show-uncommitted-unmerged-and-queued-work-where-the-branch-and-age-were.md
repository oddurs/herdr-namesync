---
id: 80
title: Show uncommitted, unmerged and queued work where the branch and age were
type: feature
status: done
milestone: v0.9
created: 2026-09-24
updated: 2026-09-24
priority: p2
area: sidebar
effort: m
---

## Problem

The top line of a Space row reads `herdr-namesync · main 17h`. With six spaces
open, five of them read exactly that, and the sixth reads `main 3h`. Neither
the branch nor how long it has sat there distinguishes one from another, and
neither says the thing that actually matters when scanning the sidebar: is
there work in this checkout that has not left the machine?

herdr's own `git_status` shows ahead/behind against the upstream, which is
close but not it. A worktree with three uncommitted files and no upstream at
all shows nothing.

## Proposal

Three tokens, each absent at zero so a landed checkout stays quiet:

- `$dirty` — `●3`, paths the working tree has changed and not committed
- `$unmerged` — `↑2`, commits on HEAD that the trunk does not have. On a
  branch, what the pull request would carry; on the trunk, what is unpushed.
  The trunk is `origin/HEAD`, then `origin/main` or `origin/master`, then the
  local branch of either name.
- `$prs` — `⇄4`, pull requests open on the repository, asked of `gh` on a
  five-minute clock, cached per repository so every worktree shares one ask.

`setup` writes them on the Spaces line in place of `branch`, `git_status` and
`$age`. `$branch` and `$age` are still published for a row that wants them.

The pull request count is the first lookup that leaves the machine. It sends
nothing but the repository name, under the user's own `gh` login, and
`showPullRequests: false` turns it off. A missing or logged-out `gh` is
remembered for a full interval rather than retried every sync.

## Acceptance criteria

- [x] `gitChanges` counts dirty paths and unmerged commits on a fixture repo
- [x] `master` is a trunk, and `origin/master` beats a local `master`
- [x] Outside a repository the counts are unknown, not zero
- [x] `publishMetadata` publishes all three on pane and workspace, formatted,
      and publishes nothing at zero
- [x] `showChanges: false` and `showPullRequests: false` skip the work
- [x] The pull request cache shares an in-flight ask and holds a failure
- [x] The managed block no longer shows `branch`, `git_status` or `$age`
