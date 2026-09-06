'use strict';
const { createHerdrSink } = require('./herdr');

/* One sink today, and the seam is still worth keeping.
 *
 * It lets `Namer` decide what a thing should be called without knowing how a
 * name is applied, and it carries the `kinds` guard: a sink declares which of
 * workspace/tab/agent it can address, so the namer never records authorship
 * for a rename that never happened.
 *
 * There were tmux and OSC sinks here. They were removed rather than fixed:
 * most of namesync — metadata tokens, $project, $since, grouping, the
 * workspace/tab/agent distinction — has no meaning outside herdr, and only
 * bare renaming ported.
 */
async function resolveSinks(cfg, { client } = {}) {
  if (cfg.sinks?.herdr?.enabled === false || !client) return [];
  const sink = createHerdrSink(client);
  const ok = typeof sink.available === 'function' ? await sink.available() : true;
  return ok ? [sink] : [];
}

module.exports = { resolveSinks, createHerdrSink };
