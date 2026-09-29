'use strict';
const crypto = require('crypto');
const { readPane } = require('./viewport');
const { readAsks } = require('./transcript');
const { normalize } = require('./naming');
const { cairnLine } = require('./cairn');

/* The second line of a sidebar row: what the person last asked for, in a
 * few words.
 *
 * The name on the first line is deliberately slow -- debounced, rate limited,
 * held when a human wrote it. This line is the opposite. It is never a name,
 * so no policy applies; it is a reminder of the request, and a reminder is
 * only worth having while it is current.
 *
 * It is the ask, not the activity. "What am I asking the computer to do" is
 * the question someone scanning twelve panes has; what the agent is doing
 * about it is on the screen when they get there. So the model is told to
 * condense the request and to use the screen only to make sense of it.
 *
 * A tracked item supersedes all of that. "do 0042" already names the work
 * better than any condensation of the sentence, so a cairn item or
 * milestone referenced in the window becomes the line as it is, from the
 * repository's own item files, and the model is not asked.
 *
 * Current means a small window, not a long memory. The model sees the last
 * thing the person asked and the last few lines on screen, nothing older.
 * More context was measured for the naming source and made answers worse
 * (see sources/llm.js); here it would also make the line slower to change,
 * which is the one thing it must not be.
 *
 * Cost is bounded three ways: the window is hashed and an unchanged screen is
 * never re-asked, a pane is asked at most once per `intervalMs`, and
 * `maxPerHour` caps every pane together. A quiet session costs nothing.
 */

const PROMPT = [
  'Below is the last thing a developer asked a coding agent, and what the',
  'agent has on screen.',
  '',
  'Reply with the request condensed to at most six words: what they asked',
  'for, keeping their own nouns, not what the agent did about it. Imperative,',
  'as if telling the agent. Drop pleasantries, reasoning and hedges. No',
  'quotes, no trailing punctuation, no preamble.',
  '',
  'Use the screen only to understand the request. If there is no request,',
  'condense what the screen shows the agent was asked to do, in the same',
  'form. Never invent a request: if nothing can be told, reply exactly:',
  'unknown',
].join('\n');

// Short, because it sits under a name and has to be read at a glance. A
// model that explains itself instead of answering is rejected rather than
// shown.
function usableSummary(text) {
  const t = normalize(String(text || '').replace(/^["'`]+|["'`.]+$/g, ''));
  if (!t || /^unknown$/i.test(t)) return '';
  const words = t.split(/\s+/).length;
  if (words > 8 || t.length > 60) return '';
  /* A fragment: one word, or a bracket or quote that never closes. That is
     a piece of the window handed back, not a request condensed. */
  if (words < 2) return '';
  for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
    if (t.split(open).length !== t.split(close).length) return '';
  }
  if ((t.match(/"/g) || []).length % 2) return '';
  if (/^(i |sorry|as an|the screen|it (looks|seems)|based on)/i.test(t)) return '';
  /* A small model with nothing to condense sometimes condenses the
     instructions instead. Anything in the prompt's own vocabulary is that,
     not a request anyone made. */
  if (/\b(condens\w*|six words|the request|preamble|imperative|summari[sz]e|the screen)\b/i.test(t)) return '';
  return t;
}

function createSummarizer({ cfg, store, source, log = () => {} }) {
  const settings = cfg.summary || {};
  const lines = settings.lines || 20;
  const intervalMs = settings.intervalMs == null ? 60000 : settings.intervalMs;
  const maxPerHour = settings.maxPerHour == null ? 600 : settings.maxPerHour;
  const maxChars = settings.maxChars || 1500;
  const transcriptRoot = settings.transcriptRoot || undefined;

  // The window: one ask, a screenful, and nothing older than either.
  async function window(client, agent) {
    const asks = readAsks(agent, { limit: 1, root: transcriptRoot });
    const { body } = await readPane(client, agent.pane_id, { lines });
    const ask = asks.length ? asks[0].slice(0, 400) : '';
    const screen = body.slice(-lines).join('\n');
    const parts = [];
    if (ask) parts.push('They asked: ' + ask);
    if (screen) parts.push('On screen:\n' + screen);
    return { ask, screen, text: parts.join('\n\n').slice(-maxChars) };
  }

  /* Which panes have something new to say, without spending anything yet.
     A pane whose window names a tracked item is answered here, for free. */
  async function due(client, agent, now, roots) {
    const { ask, screen, text } = await window(client, agent);
    if (!text) return null;
    const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
    const prev = store.summary(agent.pane_id);
    if (prev && prev.hash === hash) return null;
    const tracked = cairnLine(roots.get(agent.pane_id), { ask, screen }, now);
    if (tracked) {
      if (!prev || prev.text !== tracked) store.setSummary(agent.pane_id, { hash, at: now, text: tracked, tracked: true });
      return null;
    }
    if (prev && now - prev.at < intervalMs) return null;
    return { agent, text, hash, prev };
  }

  const atCeiling = (now) => maxPerHour > 0 && store.summariesWithin(3600000, now) >= maxPerHour;

  async function ask({ agent, text, hash, prev }, now) {
    if (atCeiling(now)) return false;
    // Charged when asked, not when answered: a declined ask still cost it.
    store.markSummary(now);
    const project = agent.tokens && agent.tokens.project;
    const system = project
      ? PROMPT + '\n\nThe repository is called "' + project + '". Do not put its name in the line.'
      : PROMPT;
    const answer = usableSummary(await source.ask(system, text, { maxTokens: 32 }));
    /* The hash is recorded either way, so a screen the model could not read
       is not asked about again until it changes. The previous text stays:
       an old description beats an empty line. */
    store.setSummary(agent.pane_id, { hash, at: now, text: answer || (prev && prev.text) || '' });
    return Boolean(answer);
  }

  return {
    /* Two phases, because the two halves scale differently. Screens are read
       one pane at a time: the socket is one request per connection, and
       reading several panes at once made herdr drop writes (EPIPE) and let
       reads time out. The model is then asked a few at a time, which is
       where the waiting actually is. A pane that fails is logged and
       skipped; one unreadable screen is no reason to leave the rest stale. */
    async refresh({ client, agents, roots = new Map(), now = Date.now(), concurrency = 3 }) {
      const pending = [];
      for (const agent of agents) {
        try {
          const item = await due(client, agent, now, roots);
          if (item) pending.push(item);
        } catch (err) {
          log('warn', 'summary for ' + agent.pane_id + ': ' + err.message);
        }
      }

      /* Said once per pass, not once per pane, and not never: a ceiling that
         is reached silently looks exactly like a feature that stopped. */
      if (pending.length && atCeiling(now)) {
        log('warn', 'summary ceiling reached: ' + maxPerHour + ' asks this hour; the second'
          + ' line stops refreshing until it clears (summary.maxPerHour)');
        return 0;
      }

      let updated = 0;
      let next = 0;
      const worker = async () => {
        while (next < pending.length) {
          const item = pending[next]; next += 1;
          try {
            if (await ask(item, now)) updated += 1;
          } catch (err) {
            log('warn', 'summary for ' + item.agent.pane_id + ': ' + err.message);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
      return updated;
    },
  };
}

module.exports = { createSummarizer, usableSummary, PROMPT };
