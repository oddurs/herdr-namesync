---
id: 36
title: Close the two known rough edges
type: feature
status: backlog
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p1
---

Both were found while setting up an OpenRouter key and both are the kind of thing a new user hits in their first hour.

**A reasoning model fails silently.** The llm source sends `max_tokens: 24`. On a reasoning model the thinking consumes that budget, the content comes back empty, `usable()` rejects it, and the source falls back to the title. No error, no log, nothing to debug -- it simply appears not to work. `openai/gpt-5-nano` is the cheapest sensible model on OpenRouter and hits this exactly. Wants a larger completion budget and `reasoning: { exclude: true }`, or a check that says so out loud.

**The daemon only gets the key if a shell spawned it.** The watcher inherits its environment at spawn. Export a key in a shell and the running daemon does not see it; worse, if herdr's startup hook launches namesync at login it inherits herdr's environment, not the user's. `status` now says 'llm has no key in $VAR', which is honest but still a puzzle. Having the daemon read an optional env file directly would make it just work.

Neither is a naming bug, which is why they were not caught: they are both about the seam between the plugin and the machine.

Done when: a reasoning model either works or explains itself, and a key set in a file survives a login-spawned daemon.
