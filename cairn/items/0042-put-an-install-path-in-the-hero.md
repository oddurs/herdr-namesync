---
id: 42
title: Put an install path in the hero
type: feature
status: done
milestone: v0.7
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: s
---

## Problem

There is no way to install namesync until four screens down. The hero has a
headline, a lede and the mock, and then the page spends three sections arguing
before it tells you how to get the thing. There is no button anywhere on the
page, and the masthead offers only "docs" and "source".

Someone who is convinced by the headline -- the best-converting moment on the
page -- has nowhere to go.

## Proposal

The install line under the lede, and two links: docs, and source. One command
is enough at that height; the full three-step block stays in the Install
section where the reasons can sit beside it.

```
herdr plugin install oddurs/herdr-namesync
```

Not a marketing button. A copyable command reads as the same register as the
rest of the site, and it is what the audience actually wants at that moment.

Depends on nothing, and it is the highest-value change per line on the page.

## Acceptance criteria

- [ ] The install command is visible without scrolling on a desktop viewport
- [ ] Docs and source are reachable from the hero
- [ ] It does not crowd the mock on narrow screens
