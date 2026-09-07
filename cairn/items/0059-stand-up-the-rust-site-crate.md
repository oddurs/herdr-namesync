---
id: 59
title: Stand up the Rust site crate
type: chore
status: backlog
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: s
---

Cargo workspace, a CLI with build and serve, and the doc collection loaded and validated at startup. Frontmatter carries title, summary and order; a doc missing one or duplicating an order is a hard error rather than a page that renders wrong. Replaces astro:content and its zod schema.
