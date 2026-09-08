---
id: 78
title: A demo you can see, and an install that is one command
type: feature
status: backlog
milestone: later
created: 2026-09-08
updated: 2026-09-08
priority: p2
area: site
effort: l
---

## Problem

namesync is three days old with no stars, against 74, 69 and 13. Age explains
the number; it does not explain the gap in how each project presents itself.

**herdr-automatic-rename** opens its README with a 1200×520 before-and-after
image of the tab bar. You understand the plugin before reading a word.

**herdr-tab-smart-rename** has a banner, an embedded **video**, and a
screenshot of its install wizard. Installation is:

    curl -fsSL https://github.com/.../install.sh | sh

which installs the plugin and opens a setup flow where you pick a model and
confirm.

**namesync** has an ASCII sidebar mock in the README, an HTML mock on the
landing page, and an install that is three commands, the middle of which
appends a fenced block to the user's `config.toml` and needs two paragraphs
explaining why.

The mock is good — it is drawn from a real session and it makes the argument.
It is also the thing a reader has to parse rather than see.

## Proposal

Two pieces, independently useful:

**A real screenshot or short capture** of the herdr sidebar before and after,
from an actual session. The HTML mock stays for the landing page, where it can
be responsive and themed; a raster asset is what GitHub and the marketplace
index will show.

**One command.** `setup --write` is careful for good reasons — it backs up,
it refuses an existing layout, it fences what it adds, it can undo. None of
that requires it to be a separate step the user has to know about. An installer
that runs it and reports what it did preserves every safeguard while removing
the step where somebody stops.

Filed under `later` because both are real work and neither is worth doing
before the positioning is true — a better demo of a claim that is wrong is
worse than no demo.

## Acceptance criteria

- [ ] A raster before/after asset from a real session, in the README
- [ ] Installation is one command that leaves the sidebar working
- [ ] Every safeguard in `setup` survives being called that way
