'use strict';
const crypto = require('crypto');
const { readPane } = require('./viewport');
const { readAsks } = require('./transcript');
const { normalize } = require('./naming');

/* The second line of a sidebar row: what the agent is doing *right now*.
 *
 * The name on the first line is deliberately slow -- debounced, rate limited,
 * held when a human wrote it. This line is the opposite. It is never a name,
 * so no policy applies; it is a description, and a description is only worth
 * having while it is fresh.
 *
 * Fresh means a small window, not a long memory. The model sees the last
 * thing the person asked and the last few lines on screen, nothing older.
 * More context was measured for the naming source and made answers worse
 * (see sources/llm.js); for a "what now" line it would also make them slower
 * to change, which is the one thing this line must not be.
 *
 * Cost is bounded three ways: the window is hashed and an unchanged screen is
 * never re-asked, a pane is asked at most once per `intervalMs`, and
 * `maxPerHour` caps every pane together. A quiet session costs nothing.
 */

const PROMPT = [
  'Below is the most recent screen of one coding agent, and the last thing the',
  'developer asked it.',
  '',
  'Reply with one line saying what the agent is doing right now: at most ten',
  'words, present tense, no quotes, no trailing punctuation, no preamble.',
  'Describe the work, not the tool -- "Fixing the worktree branch test", not',
  '"Running commands".',
  '',
  'If the screen does not say, reply exactly: unknown',
].join('\n');

// Longer than a name may be, still one line. A model that explains itself
// instead of answering is rejected rather than shown.
function usableSummary(text) {
  const t = normalize(String(text || '').replace(/^["'`]+|["'`.]+$/g, ''));
  if (!t || /^unknown$/i.test(t)) return '';
  if (t.split(/\s+/).length > 12 || t.length > 80) return '';
  if (/^(i |sorry|as an|the screen|it (looks|seems)|based on)/i.test(t)) return '';
  return t;
}

function createSummarizer({ cfg, store, source, log = () => {} }) {
  const settings = cfg.summary || {};
  const lines = settings.lines || 20;
  const intervalMs = settings.intervalMs == null ? 90000 : settings.intervalMs;
  const maxPerHour = settings.maxPerHour == null ? 120 : settings.maxPerHour;
  const maxChars = settings.maxChars || 1500;
  const transcriptRoot = settings.transcriptRoot || undefined;

  // The window: one ask, a screenful, and nothing older than either.
  async function window(client, agent) {
    const asks = readAsks(agent, { limit: 1, root: transcriptRoot });
    const { body } = await readPane(client, agent.pane_id, { lines });
    const parts = [];
    if (asks.length) parts.push('They asked: ' + asks[0].slice(0, 400));
    if (body.length) parts.push('On screen:\n' + body.slice(-lines).join('\n'));
    return parts.join('\n\n').slice(-maxChars);
  }

  async function refreshOne(client, agent, now) {
    const text = await window(client, agent);
    if (!text) return false;
    const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
    const prev = store.summary(agent.pane_id);
    if (prev && prev.hash === hash) return false;
    if (prev && now - prev.at < intervalMs) return false;
    if (maxPerHour > 0 && store.summariesWithin(3600000, now) >= maxPerHour) return false;

    // Charged when asked, not when answered: a declined ask still cost it.
    store.markSummary(now);
    const project = agent.tokens && agent.tokens.project;
    const system = project
      ? PROMPT + '\n\nThe repository is called "' + project + '". Do not put its name in the line.'
      : PROMPT;
    const answer = usableSummary(await source.ask(system, text, { maxTokens: 48 }));
    /* The hash is recorded either way, so a screen the model could not read
       is not asked about again until it changes. The previous text stays:
       an old description beats an empty line. */
    store.setSummary(agent.pane_id, { hash, at: now, text: answer || (prev && prev.text) || '' });
    return Boolean(answer);
  }

  return {
    /* Every agent, a few at a time. A pane that fails is logged and skipped;
       one unreadable screen is no reason to leave the rest stale. */
    async refresh({ client, agents, now = Date.now(), concurrency = 3 }) {
      let updated = 0;
      let next = 0;
      const worker = async () => {
        while (next < agents.length) {
          const agent = agents[next]; next += 1;
          try {
            if (await refreshOne(client, agent, now)) updated += 1;
          } catch (err) {
            log('warn', 'summary for ' + agent.pane_id + ': ' + err.message);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, agents.length) }, worker));
      return updated;
    },
  };
}

module.exports = { createSummarizer, usableSummary, PROMPT };
