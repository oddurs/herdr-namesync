---
id: 30
title: Set the repo homepage and topics
type: feature
status: done
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p0
---

`homepage` is null on the repository, so the docs site is unreachable from the GitHub page, from the marketplace card and from any tool reading the API. The site exists and is deployed; nothing points at it.

Topics currently: claude-code, herdr-plugin, terminal, tmux.

`herdr-plugin` is the one that matters -- it is what the official index queries -- and it is already there, which is why namesync is indexed at all. `tmux` is wrong (see the claims item). Worth considering alongside: herdr, developer-tools, cli.

Small, and it is the cheapest visibility in the milestone.

Done when: homepage points at the docs site and no topic contradicts the scope.
