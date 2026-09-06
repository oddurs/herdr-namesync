---
title: How it decides
summary: The rules that separate a real change of intent from noise, and why your own names always survive.
order: 2
---

herdr emits `pane.updated` when a pane's `terminal_title_stripped` changes, and
deliberately not when only the spinner moved. That event is the trigger.
Everything below is the policy that decides whether to act on it.

Each rule can decline a rename on its own, and every decline has a reason that
`namesync dry-run` will print.

## Your names win

This is the rule the others exist to protect.

namesync records every name it writes. When it next looks at a label, it
compares the live value against that record. If they differ, someone else
changed it — so it locks that workspace and never touches the name again.

There are two ways back.

**Clear the name.** An empty label is not a name — it is the clearest possible
statement that you did not want the one that was there. namesync takes the
workspace back and fills it from the agent's current intent on the next sync.

**Or release it explicitly:**

```bash
namesync unlock    # in the workspace you want managed again
```

Anything else you type is a name you wrote, and it goes on winning.

Permanent is a strong promise, so namesync makes it visible rather than
silent. A held workspace publishes `$locked`, which the sidebar can mark, and
`namesync status` lists what is held, for how long, and how far the agent has
drifted from the frozen name:

```
held names (namesync will not rename these)
  m5                            held 1d   overlap 0.00
  site                          held 1d   overlap 0.00

2 of these no longer describe what the agent is doing:
  m5                        -> Richard Stallman perspective
  site                      -> Claude Code settings configuration
```

Zero overlap means not a single significant word is shared. They still stay
held — a name you wrote wins, and it goes on winning — but you can now see the
cost of that and decide.

## herdr's own defaults are fair game

A label nobody chose is not a name worth protecting. namesync treats these as
adoptable even though it did not write them:

- the directory name herdr starts a workspace with — `bedreader`, `perfect`
- herdr placeholders — `w3`, `tab 2`, `workspace`
- an empty label

That distinction is what lets a fresh workspace get claimed on its first turn
while `testing` and `code quality` sit untouched beside it.

## A rewording is not a new intent

Agents restate the same task constantly. Comparing strings would rename on
every one of those.

Instead namesync stems both names to their roots, drops stop words, and takes
the overlap between the two token sets. Above the threshold, the intent is
considered unchanged:

| Current | Proposed | Overlap | Result |
| --- | --- | --- | --- |
| naming plugin | naming plugins | 1.00 | skipped |
| rename tmux window | renaming tmux windows | 1.00 | skipped |
| Fix auth middleware bug | Fix auth middleware tests | 0.60 | skipped |
| Herdr naming plugin | Postgres index tuning | 0.00 | renamed |

The default threshold is `0.6`. Lower it to rename more eagerly.

## It waits, then it waits again

Two separate limits, for two separate problems:

`debounceMs` waits for the title to hold still. Agents rewrite it several times
early in a turn, and renaming on the first draft means renaming three times in
four seconds.

`minRenameIntervalMs` is the floor between two renames of the same workspace.
Even with a settled title, a fast-moving session should not be able to strobe
your sidebar.

## Silence while you are blocked

When an agent is waiting on an approval dialog, its title describes the
question rather than the work. Renaming a workspace to the text of a
permissions prompt is worse than leaving it alone, so namesync sits that out
and looks again shortly after.

## It will not guess between agents

A workspace holding two agents has no single intent. Rather than pick a winner,
namesync names each **tab** after the agent inside it and leaves the workspace
label alone.

Agents themselves are always named, ambiguity or not — each one has its own
title, so there is nothing to disambiguate.

## Junk is never a name

Before any of the above, a title has to look like intent at all. These are
rejected outright:

- shell prompts — `oddurs@host:~/Code/perfect`
- commands the shell echoed — `cd namesync`, `claude --dangerously-skip-permissions`
- bare paths, and the plain repository name
- agent placeholders — `Claude Code`, `zsh`

The command test is case-sensitive on purpose. `cd namesync` is something you
typed; `Herdr session naming plugin` is something an agent wrote.

## What this cannot fix

Every rule above decides *whether* to move a name. None of them can improve the
name itself, because namesync does not write one — it moves the title the agent
already publishes.

Coding agents tend to set that title early in a session and not revise it as the
work drifts, and how often they revise it varies by agent — namesync is at the
mercy of whichever one is running. A workspace can therefore sit on a name that was accurate an hour
ago while the agent has moved on. namesync is mirroring correctly; the source is
stale. Lowering `similarityThreshold` will not help, because nothing changed
upstream to compare against.

`$project` and `$branch` exist partly for this reason. They stay true whether or
not the title has moved, which is why the recommended sidebar layout puts them
on their own line.

What namesync can do is stop the staleness being invisible. It tracks how many
agent state transitions a title survives unchanged: an agent that has finished
and restarted work several times without revising its description is probably
describing something it stopped doing. That publishes `$stale`, and `status`
lists them:

```
2 agent(s) have not revised their title in a while:
  Astro docs site GNU style           fontina
  Richard Stallman perspective        fontina
```

It is a signal and never an action. There is nothing better to rename to, and
guessing would be worse than showing a name that is merely old.
