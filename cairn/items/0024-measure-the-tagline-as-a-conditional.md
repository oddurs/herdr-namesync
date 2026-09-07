---
id: 24
title: Measure the tagline as a conditional
type: feature
status: backlog
milestone: later
created: 2026-09-06
updated: 2026-09-06
priority: p2
---

A README tagline rescues vague labels and wrecks specific ones -- 2 wins, 3 losses over 8 panes:

  cairn   'Implement project suggestions' -> 'Implement roadmap suggestions'   win
  ptop    'Planning and ordering tasks'   -> 'Process monitoring dashboard'    win
  fontina 'Fix stable toolchain'          -> 'Clean up disk space'             loss

The pattern across every context experiment is the same: added context competes with the asks rather than supplementing them. It fills a gap when the asks are thin and dilutes them when they are sharp.

So the question is not whether to include a tagline but when. namesync already gates well -- the costly-source gate is the same shape. A candidate rule: include it only when the recent asks are short or read as procedure.

Not worth building on a 2-vs-3 split. Done when: measured over more panes than 8, with a rule that beats sending nothing.
