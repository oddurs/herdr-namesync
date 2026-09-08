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
   reason to stop naming everything else in the session.

   With one exception, which is the whole point of the chain. "The title has
   failed" does not mean the title is empty -- an agent that set a name in the
   morning and never revised it is still publishing a perfectly non-empty
   string, and that string is exactly what the fallback exists to replace. So
   when the caller says the title has gone stale, a cheap answer stops being a
   return and becomes a fallback: the costly source gets its turn, and the
   title is still there to fall back on if it declines, errors or times out.

   Without that, `deep` only permits a costly source to be tried and nothing
   ever gets past the free one -- which is how the llm source went its entire
   life without being consulted once. */
async function observe(sources, context, log = () => {}) {
  let fallback = null;
  /* Which costly source was actually asked, whatever it came back with. The
     floor is charged on the request, not on the answer: a model that replies
     "unknown", errors, or times out has still cost what it cost, and treating
     that as "not consulted" would ask it again on the very next sync. */
  let consulted = null;

  for (const source of sources) {
    /* A costly source is only worth its cost when the free one has failed.
       `context.deep` is that judgement, made by the caller: the title has gone
       stale, the agent is not mid-turn, and this pane has not been consulted
       too recently. */
    if (source.costly && !context.deep) continue;
    try {
      if (source.costly) consulted = source.name;
      const answer = await source.observe(context);
      if (!answer) continue;
      const result = { intent: answer, source: source.name, costly: Boolean(source.costly) };
      // Hold the first cheap answer rather than returning it, but only while
      // something below it is actually going to be asked.
      if (!source.costly && context.deep) {
        if (!fallback) fallback = result;
        continue;
      }
      return { ...result, consulted };
    } catch (err) {
      log('warn', 'source ' + source.name + ': ' + err.message);
    }
  }

  return { ...(fallback || { intent: '', source: null, costly: false }), consulted };
}

module.exports = { resolveSources, observe, createTitleSource };
