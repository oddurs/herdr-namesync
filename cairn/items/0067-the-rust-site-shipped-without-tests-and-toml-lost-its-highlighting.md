---
id: 67
title: The Rust site shipped without tests, and TOML lost its highlighting
type: bug
status: done
milestone: v0.8
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: site
effort: s
---

## What happens

Two things, found together because the first was hiding the second.

**No tests.** The refactor added roughly a thousand lines — frontmatter
parsing, validation, markdown, highlighting, base-path handling — and shipped
with `cargo test` running zero of them, next to a JS suite of 138. CI ran
`fmt`, `clippy` and a build, none of which check that the output is right.

**TOML is not highlighted.** `SyntaxSet::load_defaults_newlines` does not
include TOML. I checked the built page for `tok-` classes, found them, and
concluded highlighting worked — but they came from the `json` and `bash` blocks
on the same page. The TOML block, which is how herdr's config is written and so
the language these documents fence with most after the shell, renders plain.

The first test written against the fence list caught it in one line.

## What should happen

`two-face` alongside syntect's defaults, which is the crate that exists for
exactly this gap. And a test that asserts every language the documents actually
fence with resolves to a syntax, so the next missing grammar fails the build
rather than rendering grey.

## Acceptance criteria

- [ ] `bash`, `sh`, `js`, `json` and `toml` all resolve to a syntax
- [ ] Frontmatter rejections are tested, including the duplicate order
- [ ] Escaping and smart-punctuation behaviour is pinned, including that a
      `--flag` inside code keeps both dashes
- [ ] `cargo test` runs in CI
