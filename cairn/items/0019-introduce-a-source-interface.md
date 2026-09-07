---
id: 19
title: Introduce a source interface
type: feature
status: done
milestone: v0.3
created: 2026-09-06
updated: 2026-09-06
priority: p0
effort: m
area: architecture
---

namesync separates deciding from applying: `Namer` chooses a name, a sink puts
it somewhere. There is no matching seam on the way in. Where the name comes
from is hardcoded -- `agent.terminal_title_stripped`, read inline in `#vars`.

Everything else in v0.3 needs that seam, so it comes first and ships alone.

A source answers one question: what is this agent working on?

    { name, available(), observe({ agent, pane, client }) -> string | null }

- `sources/title.js` is the current behaviour, extracted unchanged: read the
  stripped terminal title. Free, agent-agnostic, and stays the default.
- Sources are tried in order and the first non-empty answer wins, so a fallback
  chain costs nothing when the cheap source is working.
- Whatever a source returns goes through the existing policy untouched. A name
  from any source is still subject to holds, the similarity gate, the debounce
  and the rate limit. Nothing earns special authority by being expensive.

Done when `title` is a module rather than a line in `#vars`, the tests still
pass unchanged, and no behaviour has moved.
