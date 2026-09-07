---
id: 38
title: The rename made a latent test flake visible
type: bug
status: done
milestone: v0.6
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: test
effort: s
---

## What happens

`a path that no longer exists still resolves to the repository` (test/run.js)
fails on roughly one run in four:

    + actual   'namesync'
    - expected 'herdr-namesync'

The test is not wrong and neither is the code. Renaming the repository split two
values that used to be the same string: the remote now says `herdr-namesync`
and package.json still says `namesync`, which is the intended split. Before the
rename both branches of `detectProject` returned `namesync`, so the test could
not fail whichever branch ran.

The flake underneath it is real and predates the rename. `testAsync` pushes
every async test onto the event loop at once, so the suite fires dozens of
concurrent `git` spawns and some hit the 3000ms timeout in `git()`
(src/namer.js). Instrumenting `execFile` catches it:

    [gitfail 3518ms killed=true] -C /Users/oddurs/Code/herdr-namesync remote get-url origin

`killed=true` -- the timer fires, git is killed, `remoteName` returns '', and
detection falls through to `manifestName`. Which is correct behaviour for the
product: the fallback chain is doing exactly what it is documented to do when
git cannot answer.

So the bug is the test, which leans on the ambient repository and therefore on
git responding within 3s while the suite is hammering it.

## What should happen

The test builds its own fixture: a temp git repo with a remote, plus a
package.json naming something deliberately different, then probes a deleted
subpath inside it. That is deterministic, and it actually asserts the thing the
test means to assert -- that the remote wins over the manifest after a walk-up
-- rather than asserting that two ambient values agree.

CI has not caught this yet only because the runners have been less loaded. It is
latent there too.

## Reproduction

1. `npm test` several times over.
2. One run in four or so reports the failure above.

## Acceptance criteria

- [ ] The test owns its fixture and does not read the namesync repository
- [ ] It asserts remote-beats-manifest explicitly, with different strings
- [ ] 20 consecutive `npm test` runs pass
