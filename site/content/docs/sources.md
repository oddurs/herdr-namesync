---
title: Where names come from
summary: The default costs nothing and is usually right. What to do about the sessions where it isn't.
order: 7
---

namesync applies a name it does not write. By default that name is the agent's
own terminal title — free, instant, and available for every agent kind herdr
detects.

That is the right default, and it has one failure mode.

## When the title stops being true

Agents set a title early in a session and rarely revise it. Over a long
session the name describes work that finished hours ago. This is measurable
rather than theoretical: namesync counts how many agent state transitions a
title survives unchanged, and publishes `$stale` when it has clearly stopped
being maintained.

Nothing in the naming policy can fix that. The source has gone quiet, and
renaming more eagerly only moves a stale name around faster.

## Sources

A source answers one question — what is this agent working on — and returns a
string or nothing at all. They are consulted in order, cheapest first, and the
first real answer wins.

| Source | Cost | Default |
| --- | --- | --- |
| `title` | free | on |
| `llm` | a request per consultation | off |

Whatever a source returns goes through the same policy as anything else: a
held name is still held, a rewording is still skipped, the debounce and the
rate limit still apply. **No name earns authority by being expensive.**

## The llm source

### What leaves your machine

Before anything else about it. When this source is consulted, namesync sends to
the endpoint you configured:

- up to `maxChars` characters of the pane's visible content — 4,000 by default,
  cleaned of chrome and the spinner, which is otherwise whatever the agent has
  on screen: source, paths, output, and anything else visible at that moment
- the last few things **you** typed, read from the agent's transcript, in your
  own words
- the project name, so the model knows what it is looking at

That happens unattended, on a background timer, once per stale agent per
`deepIntervalMs`. Nobody is asked at the time.

Whether that matters depends entirely on where you point it. A model running on
your own machine sends it no further than the machine. A hosted endpoint is a
third party receiving your screen, under whatever terms you agreed to with
them, and namesync neither knows nor asks what those are.

There is no redaction. A key echoed into a terminal is on the screen like
anything else.

If that is not a trade you want to make, leave the source off — it is off by
default, and everything else here keeps working without it.

### Configuring it

Off unless you turn it on. Turning it on is the whole of the configuration if
you already run a model locally:

```json
{ "sources": { "llm": { "enabled": true } } }
```

With no endpoint set, namesync looks for Ollama, LM Studio and llama.cpp on
their usual ports and uses the first that answers, with the first model it
lists. No key, no endpoint, no model id — and nothing leaves the machine, which
is the option that makes the section above moot.

`namesync status` says which endpoint is in use and whether it is local.

To point somewhere else, set it explicitly. A configured endpoint always wins:


```json
{
  "sources": {
    "llm": {
      "enabled": true,
      "endpoint": "http://localhost:11434/v1/chat/completions",
      "model": "llama3.2",
      "apiKeyEnv": "NAMESYNC_API_KEY"
    }
  }
}
```

The key is read from the environment variable you name. It is never stored in
config.

### Where to put the key

The watcher runs detached and inherits its environment **once, at spawn**. A key
exported in a terminal reaches a watcher you restart from that terminal — and
never reaches one that herdr's startup hook launched at login, because that one
inherited herdr's environment instead. The symptom is a plugin that worked when
you set it up and is keyless the next morning.

So put it in a file:

```sh
mkdir -p ~/.config/namesync
printf 'export OPENROUTER_API_KEY=sk-or-v1-...\n' > ~/.config/namesync/env
chmod 600 ~/.config/namesync/env
```

namesync reads it at startup, whatever launched it. It never overrides a
variable already set, so a key you export deliberately in a shell still wins
over one you wrote down last month. Point somewhere else with `envFile` in
config.

`namesync status` will tell you if the source is running without a key.

### Choosing a model

The job is two to five words from a short prompt, so the cheapest fast model is
usually over-qualified. One thing to watch: **reasoning models bill their
thinking against the same completion budget**, so a small `maxTokens` can leave
them with nothing to say out loud. namesync notices and tells you rather than
falling quietly back to the title:

```
the model returned no text and stopped at the token limit — if it is a
reasoning model, raise sources.llm.maxTokens or set sources.llm.reasoning
```

`maxTokens` defaults to 64. `reasoning` is passed through untouched when set
(`{ "effort": "minimal" }`, `{ "exclude": true }`) and omitted otherwise,
because a strict OpenAI-compatible server rejects fields it does not know.

### What it is given

**What you asked for, when that is available.** herdr reports the agent's
session id — its own integration tells it — and that id *is* the transcript
filename. So namesync can read the last few things you actually said, with no
hook installed and nothing agent-specific in the plumbing:

```
"fix the stable toolchain and then continue"
"add to cairn then do them in order, plan build code-review pr merge"
```

That is real intent rather than scrollback. Turns that appear in a transcript
without anyone having said them — tool results, injected reminders, the summary
written when a conversation is compacted — are filtered out; the compaction
summary in particular is the freshest entry in a long session and describes
nothing you asked for.

**The pane, when it is not.** Cleaned of chrome, rulers and the spinner:

```
Ran 1 shell command
⏺ Yes — reverted to HEAD, losing the Option change. Re-applying.
⏺ The macOS test was never added; that script failed on its first substitution.
```

Agents run on the alternate screen, so this is the visible rows and no history.
Enough for "what now", not enough for "what has this session been about". A
session is often not reported — no integration installed, or a pane herdr has
not matched — so the pane is a real fallback rather than a theoretical one.

### When it is asked

Three conditions, all of them:

- the title has gone **stale** — namesync's own evidence that the free source
  failed
- the agent is **settled**, not mid-turn, so the pane shows a finished result
- the pane has not been consulted inside `deepIntervalMs`

Finishing alone is not enough: a title survives completions unchanged, which is
how staleness is measured in the first place. The floor is charged when a
consultation is *made*, not when it succeeds — a model that answers `unknown`
has cost what it cost, and asking again immediately is the loop the floor
exists to stop.

`deepIntervalMs` is per pane, so with ten stale agents it permits sixty
requests an hour. `maxDeepPerHour` is the ceiling across all of them, 30 by
default. Reaching it means fewer panes get named, not a larger bill.
`namesync status` reports consultations this hour and over the last day, so the
cost is visible without reading a log.

### What comes back

A label of two to five words, or nothing. A model that answers with a sentence,
an apology, or its own reasoning is rejected before the name reaches the policy,
and `unknown` is an explicit escape hatch rather than a name.

An endpoint that errors or times out is logged and skipped; the title is used
instead. A source failing is never a reason to stop naming the rest of the
session.

## What namesync will not do

herdr can send a prompt to a running agent. namesync could therefore ask an
agent what it is working on, and get a perfect answer.

It does not, and will not. That injects into your conversation, spends your
tokens, and pollutes the transcript — to fix what is ultimately a cosmetic
problem.
