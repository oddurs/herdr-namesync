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
 *   - off unless you enable it. No consent, no calls, no change.
 *   - a model on your own machine before one on somebody else's. With no
 *     endpoint configured this looks for Ollama, LM Studio and llama.cpp on
 *     their default ports and uses whichever answers, so the working setup
 *     needs no key, no endpoint and no model id -- and nothing leaves the
 *     machine. A configured endpoint still wins.
 *   - no vendor in the code. Anything speaking the OpenAI chat-completions
 *     shape works.
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

/* Runners that speak the OpenAI shape on a well-known port. Ordered by how
   likely somebody is to already have one running rather than by preference:
   they are all the same interface, and the first that answers is as good as
   any other.

   Localhost only, and by IP rather than by name -- "localhost" resolves to
   ::1 first on some systems, where nothing is listening. */
const LOCAL_RUNNERS = [
  { name: 'ollama', base: 'http://127.0.0.1:11434' },
  { name: 'lm-studio', base: 'http://127.0.0.1:1234' },
  { name: 'llama.cpp', base: 'http://127.0.0.1:8080' },
];

/* Asked once and remembered. This runs while the plugin is deciding which
   sources exist, which happens on every config load, and three connection
   attempts per load would be three too many. */
let localProbe = null;

// `runners` is a parameter so a test can point this at a stub rather than at
// whatever happens to be listening on the developer's machine.
async function probeLocal(timeoutMs = 500, runners = LOCAL_RUNNERS) {
  for (const runner of runners) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(runner.base + '/v1/models', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const body = await res.json();
      // Whichever model it lists first. Naming a workspace is a small job and
      // any model a person bothered to pull is over-qualified for it.
      const model = body && Array.isArray(body.data) && body.data[0] && body.data[0].id;
      if (!model) continue;
      return { endpoint: runner.base + '/v1/chat/completions', model, runner: runner.name };
    } catch {
      // Not listening, or not speaking this shape. Try the next.
    }
  }
  return null;
}

// Exposed so `status` can say what would be used, and so a test can reset it.
function resetLocalProbe() { localProbe = null; }

async function findLocal() {
  if (!localProbe) localProbe = probeLocal();
  return localProbe;
}

function createLlmSource(cfg = {}, root = {}) {
  /* Resolved rather than read. A configured endpoint wins outright; without
     one, whatever is listening locally is used instead. `available` settles
     this before the source is ever consulted. */
  let endpoint = cfg.endpoint || '';
  let model = cfg.model || '';
  let local = null;
  const keyEnv = cfg.apiKeyEnv || 'NAMESYNC_API_KEY';
  const timeoutMs = cfg.timeoutMs || 8000;
  /* 24 was enough for a label and a silent failure for anyone who picked a
     reasoning model, because thinking is billed against the same completion
     budget: the content came back empty, `usable` rejected it, and the source
     fell back to the title with nothing logged. 64 still refuses to pay for an
     essay -- `usable` caps the answer at eight words regardless -- while
     leaving room for a little hidden preamble. */
  const maxTokens = cfg.maxTokens || 64;
  /* Passed straight through when set, for providers that accept it
     (`{ effort: 'minimal' }`, `{ exclude: true }`). Off by default: a strict
     OpenAI-compatible server rejects fields it does not know, and a local
     llama.cpp is exactly that. */
  const reasoning = cfg.reasoning || null;
  const maxChars = cfg.maxChars || 4000;
  // Overridable so the transcript path can be pointed somewhere in tests.
  const transcriptRoot = cfg.transcriptRoot || undefined;
  const lines = root.viewportLines || 60;

  return {
    name: 'llm',
    costly: true,

    /* Settles where this is pointing, and removes the source if the answer is
       nowhere. Configured endpoint first; a local runner otherwise. */
    async available({ client } = {}) {
      if (!client) return false;
      if (!endpoint || !model) {
        const found = await findLocal();
        if (!found) return false;
        endpoint = endpoint || found.endpoint;
        model = model || found.model;
        local = found.runner;
      }
      return Boolean(endpoint && model);
    },

    // What `status` prints, so somebody can see where their screen is going.
    where: () => ({ endpoint, model, local }),

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

      /* What the repository is called, which the model otherwise has no way to
         know. Measured across 8 live panes: it never made a label worse, and
         where the name carries meaning it made one much better -- `ptop` reads
         like `htop`, so "Planning and ordering tasks" became "UI design for
         process monitoring".

         Richer context was measured and rejected. More of the session is a net
         negative, because recent asks are procedure ("plan build code-review pr
         merge") and feeding more of them teaches the model to describe the
         workflow instead of the work. A README tagline split 2 wins to 3
         losses: added context competes with the asks rather than supplementing
         them, filling a gap when they are thin and diluting them when they are
         sharp. See cairn 0024.

         This is the resolved repo name rather than the folder, so a checkout of
         `fontina` sitting in ~/Code/unifont says fontina. */
      const project = agent && agent.tokens && agent.tokens.project;
      const system = project
        ? PROMPT + '\n\nThe repository is called "' + project + '". Use it to understand'
          + ' what the work is about. Do not put its name in the label.'
        : PROMPT;

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
            max_tokens: maxTokens,
            ...(reasoning ? { reasoning } : {}),
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: screen },
            ],
          }),
        });
        if (!res.ok) throw new Error(endpoint + ' returned ' + res.status);
        const json = await res.json();
        const choice = json?.choices?.[0];
        const answer = choice?.message?.content;

        /* An empty answer from a healthy response is the reasoning-model
           failure, and it is worth naming rather than swallowing. The model
           spent the completion budget thinking and had nothing left to say
           out loud, so the source degrades to the title and the person sees
           a plugin that appears to do nothing. */
        if (!answer && choice?.finish_reason === 'length') {
          throw new Error('the model returned no text and stopped at the token'
            + ' limit -- if it is a reasoning model, raise sources.llm.maxTokens'
            + ' or set sources.llm.reasoning');
        }
        return usable(answer) || null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = {
  createLlmSource, usable, PROMPT,
  probeLocal, findLocal, resetLocalProbe, LOCAL_RUNNERS,
};
