'use strict';
const { readPane } = require('../viewport');
const { readAsks } = require('../transcript');
const { normalize } = require('../naming');

/* Asking a model what the agent is doing.
 *
 * This reverses namesync's founding claim, so it is worth stating why. "Nothing
 * generates the name" was right about what was *available*: the agent had
 * already written one, and calling a model to reproduce it would have been
 * waste. What live use showed is that the source is unreliable over long
 * sessions — a title set early survives a whole day of unrelated work.
 *
 * So generation becomes possible, and never becomes default:
 *
 *   - off unless an endpoint is configured. No key, no calls, no change.
 *   - no vendor in the code. Anything speaking the OpenAI chat-completions
 *     shape works, which includes Ollama, LM Studio and llama.cpp locally.
 *   - the key is read from an environment variable named in config, never
 *     stored in it.
 *   - costly, so the gate in Namer applies: consulted only when the title has
 *     gone stale, the agent is settled, and the floor has elapsed.
 *   - the answer goes through the same policy as any other name. It can be
 *     held, skipped as too similar, rate limited. Being expensive buys it no
 *     authority.
 */

const PROMPT = [
  'You are labelling a terminal workspace for a developer who has several',
  'coding agents running at once.',
  '',
  'Below is what one agent has on screen. Reply with a short label for the',
  'task it is working on: 2 to 5 words, no quotes, no trailing punctuation,',
  'no preamble. Describe the work, not the tool and not the activity —',
  '"Fix worktree branch detection", not "Running shell commands".',
  '',
  'If the screen does not say what the work is, reply exactly: unknown',
].join('\n');

/* A label has to survive the same scrutiny as anything else, and a model will
   occasionally answer with a sentence, an apology, or its own reasoning. */
function usable(text) {
  const t = normalize(String(text || '').replace(/^["'`]+|["'`.]+$/g, ''));
  if (!t || /^unknown$/i.test(t)) return '';
  const words = t.split(/\s+/);
  if (words.length > 8) return '';
  if (t.length > 60) return '';
  // A model explaining itself rather than answering.
  if (/^(i |sorry|as an|the screen|it (looks|seems)|based on)/i.test(t)) return '';
  return t;
}

function createLlmSource(cfg = {}, root = {}) {
  const endpoint = cfg.endpoint || '';
  const model = cfg.model || '';
  const keyEnv = cfg.apiKeyEnv || 'NAMESYNC_API_KEY';
  const timeoutMs = cfg.timeoutMs || 8000;
  const maxChars = cfg.maxChars || 4000;
  // Overridable so the transcript path can be pointed somewhere in tests.
  const transcriptRoot = cfg.transcriptRoot || undefined;
  const lines = root.viewportLines || 60;

  return {
    name: 'llm',
    costly: true,

    // An endpoint is the opt-in. Without one there is nothing to call and the
    // source removes itself rather than failing later.
    available: ({ client } = {}) => Boolean(endpoint && model && client),

    async observe({ client, agent }) {
      /* What the person asked for beats what the screen shows. herdr reports
         the agent's session id, which locates the transcript, so this needs no
         hook -- and it is real intent rather than scrollback. It is absent
         often enough (no integration installed, session not reported) that the
         pane remains the fallback rather than the exception. */
      const asks = readAsks(agent, { limit: 3, root: transcriptRoot });
      const body = asks.length
        ? asks.map((a) => 'They asked: ' + a)
        : (await readPane(client, agent && agent.pane_id, { lines })).body;
      if (!body.length) return null;

      const screen = body.join('\n').slice(-maxChars);
      const key = process.env[keyEnv];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            ...(key ? { authorization: 'Bearer ' + key } : {}),
          },
          body: JSON.stringify({
            model,
            // Deterministic enough that the same screen does not produce three
            // different names and churn the sidebar.
            temperature: 0,
            max_tokens: 24,
            messages: [
              { role: 'system', content: PROMPT },
              { role: 'user', content: screen },
            ],
          }),
        });
        if (!res.ok) throw new Error(endpoint + ' returned ' + res.status);
        const json = await res.json();
        const answer = json?.choices?.[0]?.message?.content;
        return usable(answer) || null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = { createLlmSource, usable, PROMPT };
