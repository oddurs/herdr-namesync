---
id: 29
title: Fix the claims that are no longer true
type: feature
status: backlog
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p0
---

Both descriptions still say namesync makes no model call and needs no API key:

    repo:      '... No model call, no API key.'
    manifest:  '... Event-driven, no LLM calls, no API keys.'

That was the founding claim and v0.3 changed it. The LLM source is real, opt-in, and off unless an endpoint is configured. The accurate version is stronger anyway, because it is the thing iurysza cannot say: **works with no model at all, and can use one when you want.**

The distinction matters commercially. 'No LLM' reads as a limitation to anyone comparing against a model-powered competitor. 'No LLM required' reads as respect for the reader's money.

Also stale in the same breath: the repo carries a `tmux` topic from the abandoned multiplexer-agnostic scope, and it is the only wrong signal on an otherwise correct topic list.

Done when: the repo description, the manifest description, the README opening and the site hero all say the same true thing, and `tmux` is gone.
