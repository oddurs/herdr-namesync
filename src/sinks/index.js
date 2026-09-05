'use strict';
const { createHerdrSink } = require('./herdr');
const { createTmuxSink } = require('./tmux');
const { createOscSink } = require('./osc');

// Resolves the sinks enabled in config that are actually usable right now.
// Adding a backend means adding a module here; nothing else changes.
async function resolveSinks(cfg, { client } = {}) {
  const candidates = [];
  if (cfg.sinks?.herdr?.enabled !== false && client) candidates.push(createHerdrSink(client));
  if (cfg.sinks?.tmux?.enabled) candidates.push(createTmuxSink(cfg.sinks.tmux));
  if (cfg.sinks?.osc?.enabled) candidates.push(createOscSink(cfg.sinks.osc));

  const usable = [];
  for (const sink of candidates) {
    const ok = typeof sink.available === 'function' ? await sink.available() : true;
    if (ok) usable.push(sink);
  }
  return usable;
}

module.exports = { resolveSinks, createHerdrSink, createTmuxSink, createOscSink };
