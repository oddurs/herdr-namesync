---
id: 33
title: Cut a real 0.2.0 release
type: feature
status: done
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p2
---

The manifest says `version = "0.1.0"` and the changelog has an Unreleased section holding the status-reporting and project-grounding work. There is no git tag and no GitHub release, so there is no way for anyone -- or the marketplace index, which reads the manifest version -- to tell what they are getting.

Every serious plugin in the category ships releases; iurysza's installer pulls `releases/latest`.

Should follow the rename (0027) so the release is cut against the final repository name, and follow the claims fix (0029) so the release notes are accurate.

Done when: 0.2.0 is tagged, released with notes drawn from the changelog, and the manifest agrees.
