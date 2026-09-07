---
id: 61
title: Port the templates to maud
type: feature
status: backlog
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: m
---

Base layout, home, docs page and the two components. maud rather than a template-file engine: the markup is checked at compile time, so a typo is a build error instead of a blank region. Astro scoped every component's CSS; the stylesheets are already BEM, so scoping was never load-bearing and the classes carry it.
