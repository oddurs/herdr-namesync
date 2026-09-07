---
id: 32
title: Install without editing config.toml
type: feature
status: backlog
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p1
---

This is the actual first-class gap, and herdr-plus names it as a selling point:

    'Installing it registers the plugin's actions with herdr -- no editing of your config.toml.'

namesync cannot say that. `namesync setup` writes sidebar rows into the user's `config.toml` because herdr's own `config` command has no `set`, and without those rows the tokens namesync publishes are invisible. So the honest install story today is two steps, the second of which edits a file the user owns.

That is the difference between an add-on and an integration. A plugin that mutates the host's configuration is a guest that rearranges the furniture.

Two ways out, and the first is better:

1. Upstream. Ask herdr for a way for a plugin manifest to declare sidebar rows, so installation is enough. This is already drafted in UPSTREAM.md and never filed. If it lands, `setup` disappears entirely.
2. Locally. Make `setup` idempotent, reversible and announced -- show the diff, ask once, and have `uninstall` put it back. Weaker, but it removes the surprise.

Do 2 regardless, because 1 depends on someone else and the install experience should not.

Blocks the claim in 0026 that there is nothing to install but the plugin -- which is true of toolchains and currently untrue of configuration.

Done when: a first install either needs no config edit, or makes exactly one that the user saw and can undo.
