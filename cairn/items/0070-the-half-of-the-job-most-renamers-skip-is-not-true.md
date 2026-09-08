---
id: 70
title: '"The half of the job most renamers skip" is not true'
type: bug
status: done
milestone: v0.9
created: 2026-09-08
updated: 2026-09-08
priority: p0
area: docs
effort: s
---

## What happens

README, under the sidebar demo:

> Two of the six are held — someone named them by hand, so namesync will not
> touch them again. That is the half of the job most renamers skip.

They do not skip it.

**herdr-automatic-rename**, in a section called "Good to know":

> **Manual renames win.** Rename a tab yourself and naming leaves it alone,
> though numbering still applies. Run `reset` to hand it back.

**herdr-tab-smart-rename**, fourth bullet of its README:

> Keep names you set yourself until you explicitly reset or rename them.

Both also ship the release valve — `reset` in one, "reset or rename" in the
other — which is the same shape as `namesync unlock` and clearing a label.

So the sentence is not a small exaggeration. It claims sole possession of the
one behaviour every serious plugin in this category advertises, three
paragraphs into the README, immediately under the picture that is supposed to
prove it.

## What should happen

Cut it. What is left — that the two held rows keep their names — is still worth
showing, and it does not need a false comparative to land.

If a comparative is wanted there, the honest one is about *what happens next*:
namesync publishes `$locked`, and `status` reports how far the agent has
drifted from a held name so the cost of holding it is visible. Neither rival
documents anything like that. But it is a smaller claim and should be made in
smaller words.

## Acceptance criteria

- [ ] The sentence is gone from README and the landing page
- [ ] Nothing replacing it asserts a rival lacks hand-name protection
