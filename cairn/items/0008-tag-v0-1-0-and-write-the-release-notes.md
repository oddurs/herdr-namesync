---
id: 8
title: Tag v0.1.0 and write the release notes
type: chore
status: done
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: s
area: release
---

CHANGELOG has a 0.1.0 section and the repo has no tags. Nothing is releasable
until the scope trim lands, so this closes the milestone rather than opening it.

- confirm CHANGELOG matches what shipped, including the trim
- `git tag -a v0.1.0`
- `gh release create` with notes drawn from the CHANGELOG
- check the marketplace listing renders: herdr indexes public repos tagged
  `herdr-plugin` every 30 minutes
