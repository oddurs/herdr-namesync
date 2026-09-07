'use strict';
const { createTitleSource } = require('./title');
const { createLlmSource } = require('./llm');

/* Where a name comes from.
 *
 * The mirror of `sinks/`. A sink knows how to apply a name without knowing why
 * it was chosen; a source knows how to observe what an agent is doing without
 * knowing what will be done with the answer. `Namer` sits between them and
 * owns the policy, which is the only place that decides anything.
 *
 * A source answers one question — what is this agent working on? — and returns
 * a string, or null if it cannot say. Sources are consulted in order and the
 * first real answer wins, so a fallback chain costs nothing while the cheap
 * source is working.
 *
 * Whatever comes back is subject to the same policy as anything else: holds,
 * the similarity gate, the debounce, the rate limit. No name earns authority
 * by being expensive to obtain.
 */
async function resolveSources(cfg, { client } = {}) {
  // Order is the fallback chain, cheapest first. The title is free and usually
  // right; anything below it is consulted only when the title has failed.
  const candidates = [
    createTitleSource(),
    createLlmSource(cfg.sources?.llm, cfg),
  ];

  const usable = [];
  for (const source of candidates) {
    const settings = cfg.sources?.[source.name] || {};
    const enabled = source.costly ? settings.enabled === true : settings.enabled !== false;
    if (!enabled) continue;
    const ok = typeof source.available === 'function' ? await source.available({ cfg, client }) : true;
    if (ok) usable.push(source);
  }
  return usable;
}

/* The first source with something to say. A source that throws is skipped
   rather than allowed to stop the sync -- an observation failing is not a
   reason to stop naming everything else in the session. */
async function observe(sources, context, log = () => {}) {
  for (const source of sources) {
    /* A costly source is only worth its cost when the free one has failed.
       `context.deep` is that judgement, made by the caller: the title has gone
       stale, the agent is not mid-turn, and this pane has not been consulted
       too recently. */
    if (source.costly && !context.deep) continue;
    try {
      const answer = await source.observe(context);
      if (answer) return { intent: answer, source: source.name, costly: Boolean(source.costly) };
    } catch (err) {
      log('warn', 'source ' + source.name + ': ' + err.message);
    }
  }
  return { intent: '', source: null, costly: false };
}

module.exports = { resolveSources, observe, createTitleSource };
