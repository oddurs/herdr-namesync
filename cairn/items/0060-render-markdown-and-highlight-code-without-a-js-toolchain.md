---
id: 60
title: Render markdown and highlight code without a JS toolchain
type: feature
status: backlog
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: m
---

pulldown-cmark for CommonMark, syntect for highlighting. The fences in use are bash, sh, js, json and toml, plus plain blocks. Shiki emitted inline CSS variables; classed output is smaller and themeable, so tokens are namespaced classes mapped to the Gotham palette in CSS. The --astro-code-* variables retire with the toolchain that named them.
