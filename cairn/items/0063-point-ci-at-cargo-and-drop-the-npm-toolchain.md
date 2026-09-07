---
id: 63
title: Point CI at cargo and drop the npm toolchain
type: chore
status: backlog
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: s
---

The site job runs npm ci and npm run build. It becomes cargo build and cargo run -- build. package.json, package-lock.json and node_modules go with it.
