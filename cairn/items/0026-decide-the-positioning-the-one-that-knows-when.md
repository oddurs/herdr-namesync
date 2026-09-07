---
id: 26
title: 'Decide the positioning: the one that knows when'
type: feature
status: done
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p0
---

The category is crowded and we did not know how crowded. The official marketplace (herdr.dev/plugins, an automatic index of `topic:herdr-plugin` repos with a manifest) currently lists 969 repositories, and 23 of them rename things:

    ★71  +17/7d   qu8n/herdr-automatic-rename
    ★69  + 2/7d   iurysza/herdr-tab-smart-rename
    ★12            wyattjoh/herdr-plugin-renamer
    ★16            wenhanweime/herdr-plugin-renamer
    ...
    ★ 0            oddurs/herdr-namesync

Being twenty-fourth into a solved-looking problem means the positioning has to be specific or it is noise.

What the field actually does, from reading their READMEs:

- qu8n (the leader) composes a breadcrumb -- `api › feat/oauth › nvim`, directory then branch then program. It answers *where am I*, not *what is happening*. Deterministic, no model. Needs jq, bash and a shell hook; Linux and macOS only.
- iurysza is the closest competitor and already has manual-name respect, cheap-before-costly, and per-pane labels. Needs Bun and a curl-pipe-sh installer.
- wyattjoh and wenhanweime name once, from the **first prompt**, and never revise.

That last point is the opening. Naming from the first prompt is the stale-title problem institutionalised: it is correct for ten minutes and wrong for the rest of the day. namesync's v0.3 exists precisely to notice that a name has drifted from reality (`$stale`) and to refresh it.

So the claim is not 'names your tabs' -- twenty-three plugins do that. It is:

  **Everyone else decides what to call it. namesync decides when to change it.**

What backs the claim, and nothing else should be claimed:

1. A policy that is inspectable rather than implicit -- debounce, rate limit, similarity gate, holds -- with `dry-run` and `status` able to say why a rename did *not* happen. No competitor can explain a non-rename.
2. Staleness detection. Others name once or rename on every event; this notices drift.
3. Nothing to install but the plugin. No jq, no bash hook, no Bun, no Rust toolchain, no curl-pipe-sh. Node only, and zero dependencies.
4. Useful with no model and no key at all. The default path is free and instant; the LLM source is opt-in. iurysza opens with a model-choosing wizard.
5. Windows. The manifest declares all three platforms; qu8n is Linux and macOS only.
6. Measured rather than asserted -- we have A/B tables for context sourcing that nobody else in the category publishes.

Done when: a positioning statement exists in the repo that a stranger can check against the competition, and every later item in this milestone is written to serve it.
