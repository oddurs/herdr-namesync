---
id: 11
title: Revise TOKENS.md now that smali is abandoned
type: docs
status: done
milestone: v0.1
created: 2026-09-06
updated: 2026-09-06
priority: p1
effort: s
area: docs
---

TOKENS.md is built around smali reading five namesync tokens by name and cites
it as the live second party to the contract. smali is being abandoned, so that
framing is historical.

What survives and is still worth keeping:

- the token list itself — anything reading namesync's metadata needs it
- the flat-namespace finding, which is a property of herdr rather than of any
  consumer: one map per workspace, last writer wins, either source can clear
  the other's key
- the `role` claim convention and the guard built on it

Rewrite so the contract stands on its own rather than on a dependency that no
longer exists. Keep the probe output; it is evidence about herdr.
