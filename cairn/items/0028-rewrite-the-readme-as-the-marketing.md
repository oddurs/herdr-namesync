---
id: 28
title: Rewrite the README as the marketing
type: feature
status: backlog
milestone: v0.5
created: 2026-09-07
updated: 2026-09-07
priority: p1
---

The README is the marketing. There is no other surface that matters: the marketplace card shows the GitHub description, awesome-herdr shows one sentence, and anyone who clicks through lands on the README. The Astro site is secondary and gets whatever the README settles.

What the current README does wrong: it explains what namesync does before establishing why a twenty-fourth renamer should exist. Against 23 competitors, the first screen has to answer 'why not the one with 71 stars'.

Shape it against what the leaders do, because they are doing it well:

- qu8n opens with a fenced block of before/after tab names. It is the clearest thing in the category and it is four lines long.
- iurysza opens with a banner and a demo video.

Both show rather than describe. Ours currently describes.

Proposed first screen:

1. One sentence that contains the differentiator, not the category. Not 'names your workspaces' -- 'keeps the name current, and knows when to leave it alone'.
2. A block showing a name **changing** as the work changes, and a second showing a name held because it was set by hand. The held case is the one nobody else can show.
3. The install line, immediately. One command, no toolchain.
4. A short 'why another one' section naming the alternatives honestly and saying what they are better at. Being fair about qu8n's breadcrumb being better for 'where am I' buys the credibility to claim 'when should this change'.

Then the existing reference material, unchanged -- it is good and it stays below the fold.

Carry over from 0026: claim only the six things that are backed.

Done when: someone who has already installed a renamer can read the first screen and tell whether to switch.
