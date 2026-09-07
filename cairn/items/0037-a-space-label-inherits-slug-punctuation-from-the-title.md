---
id: 37
title: A Space label inherits slug punctuation from the title
type: bug
status: done
milestone: v0.6
created: 2026-09-07
updated: 2026-09-07
priority: p1
area: naming
effort: s
---

## What happens

Spaces and Agents want different shapes. An Agent name is an identifier -- herdr
enforces `[a-z][a-z0-9_-]{0,31}` -- and `slugify` produces one. A Space label is
prose: no charset, no cap, sentence case. `stripProject` is the only rewriting a
Space label gets, and it does not know that.

When the agent's own title is already slug-shaped, the prose surface inherits
the slug. Live, from the sidebar right now:

| Agent name | Space label |
| --- | --- |
| `ptop-adopt-remaining-lessons` | `Adopt-remaining-lessons` |
| `terminal-obsidian-clone` | `Terminal Obsidian clone` |
| `claude-code-settings` | `Claude Code settings configuration` |

The second and third are right. The first is a slug with a capital letter bolted
on, and it is the example the docs themselves use for `stripProjectPrefix`.

The cause is in `stripProject` (src/naming.js): it strips `^ptop[\s:_/-]+`,
capitalises the first letter, and returns whatever separators the rest of the
title happened to use.

## What should happen

`Adopt remaining lessons`. When a Space label is derived from a slug-shaped
title, the separators become spaces, because the label is prose and prose does
not use hyphens as word separators.

Only for the prose surfaces -- workspace and tab. An agent name must stay a
slug, so it must not go through this.

Do not de-hyphenate blindly. `ptop-adopt` is a slug; `well-known` and
`ptop-cli` are words. The rule needs a test that says which is which -- most
plausibly "the whole title is one hyphenated run with no spaces in it", which
is what makes it a slug rather than a phrase containing a hyphen.

## Reproduction

1. `node -e "console.log(require('./src/naming').stripProject('ptop-adopt-remaining-lessons','ptop'))"`
2. Prints `Adopt-remaining-lessons`.

## Not doing: a length budget

Measured first, since the asymmetry looked worse than it is. Agent names are
capped at 32 and de-duplicated; Space labels have no cap anywhere in the plugin
or the sink. Ten live workspaces:

    1, 5, 5, 7, 19, 23, 23, 24, 28, 34

The longest is 34. Nothing is running away, herdr already clips to the column,
and namesync does not know the sidebar width -- a guessed cap would cut prose
mid-word where herdr would clip it correctly. No cap.

## Acceptance criteria

- [ ] A slug-shaped title yields a prose Space label
- [ ] A title containing an ordinary hyphen keeps it
- [ ] Agent names are unaffected and still slugs
