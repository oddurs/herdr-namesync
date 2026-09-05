'use strict';
const fs = require('fs');
const path = require('path');
const { HerdrApi, HerdrEvents } = require('./client');
const { Store, stateDir } = require('./state');
const { Namer } = require('./namer');
const { resolveSinks } = require('./sinks');
const config = require('./config');

// herdr emits pane.updated when a pane's terminal_title_stripped changes, and
// explicitly NOT for spinner-only title churn. That is the intent signal;
// everything else here is bookkeeping around it.
//
// pane.agent_status_changed is absent on purpose: herdr requires a per-pane
// filter for that one, and a rename deferred because an agent was blocked is
// retried on a timer instead.
const SUBSCRIPTIONS = [
  'pane.updated',
  'pane.agent_detected',
  'pane.closed',
  'pane.exited',
  'workspace.created',
  'workspace.renamed',
  'workspace.closed',
  'tab.created',
  'tab.renamed',
];

// Subscriptions are named with dots; the events that come back use
// underscores. Normalising here keeps the rest of the code readable.
const canon = (name) => String(name || '').replace(/_/g, '.');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

// ~10 minutes of retries at the capped backoff before the watcher stops.
const MAX_FAILURES = 25;

class Daemon {
  constructor({ logFile } = {}) {
    this.logFile = logFile || path.join(stateDir(), 'daemon.log');
    this.store = new Store();
    this.events = null;   // subscription socket: events only
    this.api = null;      // request socket: snapshots and renames
    this.timer = null;
    this.stopping = false;
    this.backoff = 500;
    this.renames = 0;
    this.failures = 0;
    // Resolved by stop(), so a shutdown does not wait on a 'disconnect' that
    // close() suppresses by design.
    this.wake = null;
    this.durationTimer = null;
  }

  log(level, message) {
    const cfg = this.cfg || config.load();
    if (LEVELS[level] != null && LEVELS[level] > (LEVELS[cfg.logLevel] ?? 2)) return;
    const line = new Date().toISOString() + ' [' + level + '] ' + message + '\n';
    try {
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      fs.appendFileSync(this.logFile, line);
    } catch { /* logging must never take the daemon down */ }
    if (process.env.NAMESYNC_FOREGROUND) process.stdout.write(line);
  }

  async start() {
    this.log('info', 'starting (pid ' + process.pid + ')');
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
    await this.#connectLoop();
  }

  async #connectLoop() {
    while (!this.stopping) {
      try {
        // #session only ever returns by throwing, so any reset placed after
        // this await is dead code. It happens on a healthy subscribe instead.
        await this.#session();
      } catch (err) {
        this.failures += 1;
        // A subscribe that rejects with an error (rather than closing) leaves
        // its socket open, and the next session overwrites the reference.
        this.#teardown();
        this.log('warn', 'session ended: ' + err.message);
      }
      if (this.stopping) break;

      // Give up rather than retrying a server that is never coming back.
      // A herdr restart or live handoff reconnects well inside this; an
      // uninstalled herdr does not, and the watcher should not idle forever.
      if (this.failures >= MAX_FAILURES) {
        this.log('error', 'herdr unreachable after ' + this.failures
          + ' attempts; stopping. Start it again with: namesync start');
        break;
      }

      await new Promise((r) => setTimeout(r, this.backoff));
      this.backoff = Math.min(this.backoff * 2, 30000);
    }
    this.#removePid();
    this.log('info', 'stopped');
  }

  async #session() {
    // The subscription needs its own connection: herdr dedicates a subscribed
    // socket to events and hangs up if a request is sent down it. Requests go
    // through HerdrApi, which opens a fresh connection per call because the
    // server closes each one after it answers.
    const events = new HerdrEvents();
    const api = new HerdrApi();
    this.events = events;
    this.api = api;

    const closed = new Promise((resolve) => {
      events.once('disconnect', () => resolve('events'));
      events.on('error', () => {});
      this.wake = () => resolve('stopped');
    });

    // Attached before subscribing: herdr replays a backlog that can arrive in
    // the same chunk as the ack, and the reader drains a chunk synchronously.
    events.on('event', (msg) => this.#onEvent(msg));

    await events.subscribe(SUBSCRIPTIONS);
    // A healthy session clears the failure budget, so a watcher that survives
    // many herdr restarts never creeps up on the give-up threshold.
    this.backoff = 500;
    this.failures = 0;
    this.log('info', 'subscribed to ' + SUBSCRIPTIONS.length + ' event types');

    // Converge immediately so a restart does not wait for the next event.
    await this.sync().catch((err) => this.log('warn', 'initial sync: ' + err.message));

    // Elapsed time is the only thing that changes without an event. The sync
    // is idempotent and the metadata dedup means a tick usually writes nothing.
    const cfg = config.load();
    if (cfg.showDuration && cfg.durationRefreshMs > 0) {
      this.durationTimer = setInterval(() => {
        this.sync().catch((err) => this.log('debug', 'duration tick: ' + err.message));
      }, cfg.durationRefreshMs);
      this.durationTimer.unref?.();
    }

    const which = await closed;
    this.#teardown();
    throw new Error(which + ' socket closed');
  }

  #teardown() {
    if (this.durationTimer) { clearInterval(this.durationTimer); this.durationTimer = null; }
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.events) { this.events.close(); this.events = null; }
    if (this.api) { this.api.close(); this.api = null; }
  }

  /* Exactly one watcher may own the pid file. A daemon that finds another
     pid there has been superseded — by a restart that raced its own shutdown,
     or by a manual start — and stands down rather than writing state.json
     alongside the winner. Prevention is not enough on its own: an orphan from
     before a fix has no other way to notice it should stop. */
  #supersededBy() {
    try {
      const owner = Number(fs.readFileSync(path.join(stateDir(), 'daemon.pid'), 'utf8').trim());
      return owner && owner !== process.pid ? owner : null;
    } catch {
      return null; // no pid file: nothing has claimed ownership
    }
  }

  #removePid() {
    // Only ever remove the pid file if it still names us.
    if (this.#supersededBy()) return;
    try { fs.unlinkSync(path.join(stateDir(), 'daemon.pid')); } catch { /* fine */ }
  }

  #onEvent(msg) {
    const type = canon(msg.event || msg.data?.type || msg.type);
    const body = msg.data || msg;
    if (!type) return;

    // A rename only schedules a resync. It deliberately does NOT lock from the
    // event payload: herdr replays a backlog on subscribe, so those labels may
    // be long superseded. The policy compares live state against recorded
    // authorship, which is correct whenever the event actually arrived.
    // Scope the forget to what actually closed. A pane_closed payload carries
    // its owning workspace_id too, so preferring that would drop the whole
    // workspace's lock and authorship when a single agent exits.
    if (type === 'workspace.closed') {
      if (body.workspace_id) this.store.forget(body.workspace_id).save();
      return;
    }
    if (type === 'pane.closed' || type === 'pane.exited') {
      const paneId = body.pane_id || body.pane?.pane_id;
      if (paneId) this.store.forget(paneId).save();
      return;
    }
    this.log('debug', 'event ' + type);
    this.schedule();
  }

  schedule(delayMs) {
    const cfg = config.load();
    const delay = delayMs == null ? cfg.debounceMs : delayMs;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.sync().catch((err) => this.log('warn', 'sync: ' + err.message));
    }, delay);
  }

  async sync() {
    if (!this.api) return [];

    const winner = this.#supersededBy();
    if (winner) {
      this.log('warn', 'superseded by watcher pid ' + winner + '; standing down');
      this.stop();
      return [];
    }

    const cfg = config.load();
    this.cfg = cfg;
    if (!cfg.enabled) return [];

    const snapshot = (await this.api.snapshot()).snapshot;
    const sinks = await resolveSinks(cfg, { client: this.api });
    const namer = new Namer({
      cfg,
      store: this.store,
      sinks,
      log: (level, message) => this.log(level === 'rename' ? 'info' : level, message),
    });
    const plans = await namer.buildPlans(snapshot);
    const applied = await namer.apply(plans);
    this.renames += applied.length;

    // Independent of renaming: the project is still worth publishing when the
    // title has not moved.
    const published = await namer.publishMetadata(snapshot);
    if (published) this.log('info', 'published ' + published + ' metadata record(s)');

    // Plans deferred by the rate limit or by a blocked agent get no further
    // event, so revisit them on a timer.
    const retry = plans
      .map((p) => p.verdict.retryInMs)
      .filter((ms) => typeof ms === 'number' && ms > 0);
    if (retry.length && !this.timer) this.schedule(Math.min(...retry) + 250);

    return applied;
  }

  stop() {
    this.stopping = true;
    this.#teardown();
    // close() sets `closed` on the client, which suppresses 'disconnect', so
    // without this the session would await a promise nobody can settle.
    if (this.wake) { this.wake(); this.wake = null; }
  }
}

module.exports = { Daemon, SUBSCRIPTIONS, canon };
