---
id: 40
title: The landing page ships the failure the docs warn about
type: bug
status: backlog
milestone: v0.7
created: 2026-09-07
updated: 2026-09-07
priority: p0
area: site
effort: s
---

## What happens

The Install section of `site/src/pages/index.astro` reads:

```
herdr plugin install oddurs/herdr-namesync
herdr integration install claude
```

`namesync setup --write` is not there. Anyone who follows the landing page
installs the plugin, restarts herdr and sees **nothing change** -- because
herdr renders none of `$project`, `$branch`, `$since` or `$n` until the sidebar
asks for them, and `herdr config` has no `set` for a plugin to do it with.

`install.md` says this in as many words: "This step is not optional, and it is
the one that catches people out." The landing page is the page that catches
them out.

This is the worst outcome the site can produce: a first run that looks broken,
from the page most people arrive on.

## What should happen

Three lines, in the order the README already uses, with the middle one carrying
its reason:

```
herdr plugin install oddurs/herdr-namesync
namesync setup --write            # add the sidebar rows herdr needs
herdr integration install claude  # sharper agent state detection
```

And `namesync dry-run` named as the safe first move afterwards -- it prints
every decision and changes nothing, which is the right way to meet a plugin
that renames things.

## Reproduction

1. Open the landing page, follow the Install section exactly.
2. Nothing visible changes in herdr.

## Acceptance criteria

- [ ] The landing page install block includes `setup --write` and says why
- [ ] `dry-run` is offered as the first thing to run
- [ ] The block matches the README and `install.md` step for step
