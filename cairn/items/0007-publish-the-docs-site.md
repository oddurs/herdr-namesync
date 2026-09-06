---
id: 7
title: Publish the docs site
type: chore
status: backlog
milestone: v1.0
created: 2026-09-06
updated: 2026-09-06
priority: p2
effort: m
area: docs
---

Eight built pages currently reach nobody: the Astro site lives in `site/` and
is only readable as markdown on GitHub. The domain references were removed
because namesync.dev is not owned.

GitHub Pages costs one CI job and no domain. Add a `pages` job to the existing
workflow, publish `site/dist` on push to main, and point the README and the
issue-template link at it.

Not urgent — the docs are readable in the repo — but it is the difference
between a plugin someone evaluates and one they only skim.
