---
id: 72
title: Prefer a local model, the way the competition does
type: feature
status: backlog
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p1
area: sources
effort: m
---

## Problem

namesync's llm source has no default endpoint, which is presented as neutrality
— "there is no vendor in the code". In practice it means the path of least
resistance is an API key and a remote provider, because that is what the
documentation's examples configure and what the env-file section is written for.

herdr-plugin-renamer resolves the same problem in the opposite order:

> Slugs come from Apple FoundationModels on supported Macs, then Codex, then a
> deterministic local fallback.

On-device first, no key, nothing transmitted, and a deterministic fallback when
neither is available. Free and private by construction rather than by
configuration.

herdr-tab-smart-rename reuses a provider the user has already connected in Pi
or OpenCode, so there is no key to place at all for anyone who has either.

namesync asks the user to obtain a key, choose where to store it, and read a
section about why a login-spawned daemon will not see it. That is the most
friction and the weakest privacy story of the three.

## Proposal

Ordered discovery rather than a single configured endpoint:

1. A local endpoint if one is listening — Ollama and LM Studio have well-known
   default ports, and the code already speaks their shape.
2. A configured endpoint, exactly as today.
3. Nothing, and the title stands.

The docs already claim anything OpenAI-compatible works "including a model
running on your own machine". This makes that the default path rather than a
footnote.

Worth checking whether herdr exposes the agent's own provider, the way
smart-rename reuses Pi's — reusing a connection the user already made would
beat every option above.

## Acceptance criteria

- [ ] A local endpoint is found and used without configuration
- [ ] A configured endpoint still wins if set
- [ ] `status` says which one is in use, and whether it is local
- [ ] Nothing is transmitted off-machine without the user having configured it
