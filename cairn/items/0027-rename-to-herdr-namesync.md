---
id: 27
title: Rename to herdr-namesync
type: feature
status: backlog
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p1
---

22 of the 23 renaming plugins in the marketplace are named `herdr-*`. namesync is the one that is not.

This is a distribution question rather than a branding one, because the install command **is** the repository name:

    herdr plugin install oddurs/herdr-namesync          <- says nothing
    herdr plugin install oddurs/herdr-namesync    <- self-documenting

The marketplace can sort by name, and the ecosystem index (awesome-herdr) groups by prefix. A name without the prefix is invisible in both. The higher-star projects in the wider ecosystem use `herdr-<thing>` (herdr-plus ★289, herdr-worktrunk ★130) rather than the more verbose `herdr-plugin-<thing>`.

The brand is not lost. Keep `namesync` as the command, the manifest id, the config directory and the docs voice; `herdr-namesync` is the repository and the install line. This is exactly what herdr-plus does.

Cost is low: GitHub redirects the old URL, clones, and the existing PR history.

Touches: repo name, the site's base URL and every internal link, README install lines, docs install lines, CONTRIBUTING, the plugin id shown in `herdr plugin list`, and the CI pages deploy.

Done when: `herdr plugin install oddurs/herdr-namesync` works from a clean machine, the docs site resolves at its new base, and no dead links remain.
