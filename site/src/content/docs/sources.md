---
title: Where names come from
summary: The default costs nothing and is usually right. What to do about the sessions where it isn't.
order: 6
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

Off unless you configure it. There is no default endpoint, because there is no
vendor in the code — anything speaking the OpenAI chat-completions shape works,
including a model running on your own machine.

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

### What it is given

The pane, cleaned: chrome, rulers and the spinner removed, leaving what the
agent has actually said and done. Roughly twenty lines of real narrative —

```
Ran 1 shell command
⏺ Yes — reverted to HEAD, losing the Option change. Re-applying.
Ran 3 shell commands
⏺ The macOS test was never added; that script failed on its first substitution.
```

Agents run on the alternate screen, so this is the visible rows and no history.
Enough for "what now", not enough for "what has this session been about".

### When it is asked

Three conditions, all of them:

- the title has gone **stale** — namesync's own evidence that the free source
  failed
- the agent is **settled**, not mid-turn, so the pane shows a finished result
- the pane has not been consulted inside `deepIntervalMs`

Finishing alone is not enough: a title survives completions unchanged, which is
how staleness is measured in the first place. The floor is charged only when a
consultation actually happens, so a cheap answer never postpones the next real
attempt.

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
