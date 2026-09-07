#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const { Store, stateDir } = require('./state');
const { HerdrApi } = require('./client');
const { Namer } = require('./namer');
const { resolveSinks } = require('./sinks');
const { resolveSources } = require('./sources');
const { Daemon } = require('./daemon');
const { planOrder, applyOrder } = require('./grouping');
const setup = require('./setup');
const { similarity, formatSince } = require('./naming');

const PID_FILE = path.join(stateDir(), 'daemon.pid');
const LOG_FILE = path.join(stateDir(), 'daemon.log');

function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (!pid) return null;
    process.kill(pid, 0); // throws if the process is gone
    return pid;
  } catch { return null; }
}

function writePid(pid) {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(pid));
}

// herdr startup hooks are one-shot, so the hook detaches the watcher and exits
// rather than blocking the server. The pid file keeps it to one instance.
function startDaemon() {
  const existing = readPid();
  if (existing) return { started: false, pid: existing };

  const child = spawn(process.execPath, [path.join(__dirname, 'cli.js'), 'daemon'], {
    detached: true,
    stdio: 'ignore',
    cwd: path.dirname(__dirname),
    env: process.env,
  });
  child.unref();
  writePid(child.pid);
  return { started: true, pid: child.pid };
}

function stopDaemon() {
  const pid = readPid();
  if (!pid) return false;
  try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  try { fs.unlinkSync(PID_FILE); } catch { /* fine */ }
  return true;
}

async function withClient(fn) {
  // HerdrApi opens a connection per request, so there is nothing to tear down.
  return fn(new HerdrApi());
}

async function buildNamer(client, { dryRun = false } = {}) {
  const cfg = config.load();
  const store = new Store();
  const sinks = dryRun ? [] : await resolveSinks(cfg, { client });
  const sources = await resolveSources(cfg, { client });
  const lines = [];
  const namer = new Namer({
    cfg, store, sinks, sources, client,
    log: (level, message) => lines.push(level + ': ' + message),
  });
  return { cfg, store, namer, lines };
}

function currentWorkspaceId() {
  if (process.env.HERDR_WORKSPACE_ID) return process.env.HERDR_WORKSPACE_ID;
  try {
    const ctx = JSON.parse(process.env.HERDR_PLUGIN_CONTEXT_JSON || '{}');
    return ctx.workspace?.workspace_id || ctx.workspace_id || null;
  } catch { return null; }
}

function formatPlan(p) {
  const verdict = p.verdict.rename ? 'rename' : 'skip';
  return [
    verdict.padEnd(7),
    (p.kind + ' ' + p.id).padEnd(16),
    JSON.stringify(p.current).padEnd(30),
    '->',
    JSON.stringify(p.desired).padEnd(30),
    '| ' + p.verdict.reason,
  ].join(' ');
}

// Shared implementation for rename-now / rename-all.
async function runRename(only, force = false) {
  await withClient(async (client) => {
    const snapshot = (await client.snapshot()).snapshot;
    const { namer, lines } = await buildNamer(client);
    const plans = await namer.buildPlans(snapshot, { ...(only ? { only } : {}), force });
    const applied = await namer.apply(plans);
    const skipped = plans.filter((p) => !p.verdict.rename);

    const out = [];
    for (const p of applied) out.push('renamed ' + p.kind + ' ' + p.id + ' -> "' + p.desired + '"');
    if (!applied.length) out.push('nothing to rename');
    for (const p of skipped) out.push('  skip ' + p.kind + ' ' + p.id + ': ' + p.verdict.reason);
    for (const l of lines) if (l.startsWith('warn')) out.push(l);
    process.stdout.write(out.join('\n') + '\n');
  });
}

const COMMANDS = {
  // Invoked by the herdr [[startup]] hook.
  async startup() {
    const { started, pid } = startDaemon();
    process.stdout.write((started ? 'started watcher pid ' : 'watcher already running pid ') + pid + '\n');
  },

  // The long-lived process itself.
  async daemon() {
    writePid(process.pid);
    const d = new Daemon({ logFile: LOG_FILE });
    await d.start();
  },

  async start() { return COMMANDS.startup(); },

  async stop() {
    process.stdout.write(stopDaemon() ? 'watcher stopped\n' : 'watcher was not running\n');
  },

  async restart() {
    const previous = readPid();
    stopDaemon();
    // Waiting a fixed 200ms raced a slow shutdown: the pid file is unlinked
    // immediately, so startDaemon saw "not running" and a second watcher came
    // up alongside the first, both writing state.json.
    if (previous) {
      for (let i = 0; i < 50; i += 1) {
        try { process.kill(previous, 0); } catch { break; }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const { pid } = startDaemon();
    process.stdout.write('watcher restarted pid ' + pid + '\n');
  },

  async status() {
    const cfg = config.load();
    const store = new Store();
    const pid = readPid();
    const out = [];
    out.push('namesync');
    out.push('  watcher     ' + (pid ? 'running (pid ' + pid + ')' : 'not running'));
    out.push('  enabled     ' + cfg.enabled);
    out.push('  targets     ' + Object.entries(cfg.targets).filter(([, v]) => v).map(([k]) => k).join(', '));
    out.push('  debounce    ' + cfg.debounceMs + 'ms, min interval ' + cfg.minRenameIntervalMs + 'ms');
    out.push('  similarity  ' + cfg.similarityThreshold);
    out.push('  config      ' + config.configPath());
    out.push('  log         ' + LOG_FILE);
    const locked = Object.keys(store.data.locked);
    out.push('  locked      ' + (locked.length ? locked.length + ' workspace(s)' : 'none'));
    // The herdr sink's availability check does no I/O, so listing it proves
    // nothing. status is exactly when someone wants to know if herdr answers.
    try {
      await withClient(async (client) => {
        await client.request('ping', {}, { timeoutMs: 3000 });
        const sinks = await resolveSinks(cfg, { client });
        out.push('  sinks       ' + (sinks.map((s) => s.name).join(', ') || 'none'));
      });
    } catch (err) {
      out.push('  sinks       herdr unreachable (' + err.message + ')');
    }

    /* A lock is the one state that changes what namesync does, and it used to
       be reported as a bare workspace id. What a reader needs is which name is
       frozen, how long it has been, and whether the agent has moved on. */
    if (locked.length) {
      out.push('');
      out.push('held names (namesync will not rename these)');
      try {
        await withClient(async (client) => {
          const snap = (await client.snapshot()).snapshot;
          const drifted = [];
          for (const id of locked) {
            const info = store.lockInfo(id) || {};
            const ws = snap.workspaces.find((w) => w.workspace_id === id);
            const agent = snap.agents.find((a) => a.workspace_id === id);
            const label = (ws && ws.label) || info.label || id;
            const age = info.at ? formatSince(Date.now() - info.at) : '?';
            const title = agent ? agent.terminal_title_stripped : '';
            const overlap = title ? similarity(label, title) : null;

            out.push('  ' + label.slice(0, 28).padEnd(30)
              + 'held ' + age.padEnd(5)
              + (overlap === null ? '' : 'overlap ' + overlap.toFixed(2)));
            if (overlap !== null && overlap === 0) drifted.push({ label, title, id });
          }
          if (drifted.length) {
            out.push('');
            out.push(drifted.length + ' of these no longer describe what the agent is doing:');
            for (const d of drifted) {
              out.push('  ' + d.label.slice(0, 24).padEnd(26) + '-> ' + d.title.slice(0, 40));
            }
            out.push('');
            out.push('These stay held until you say otherwise. `namesync unlock` in a');
            out.push('space releases it, and the name follows the agent again.');
          }
        });
      } catch {
        for (const id of locked) {
          const info = store.lockInfo(id) || {};
          out.push('  ' + (info.label || id));
        }
      }
    }

    /* A title the agent stopped maintaining. namesync cannot fix this -- it
       moves a name it does not write -- but it can stop the staleness being
       invisible. */
    try {
      await withClient(async (client) => {
        const snap = (await client.snapshot()).snapshot;
        const stale = snap.panes.filter((p) => p.tokens && p.tokens.stale === 'stale');
        if (!stale.length) return;
        out.push('');
        out.push(stale.length + ' agent(s) have not revised their title in a while:');
        for (const p of stale) {
          const ws = snap.workspaces.find((w) => w.workspace_id === p.workspace_id);
          out.push('  ' + ((ws && ws.label) || p.workspace_id).slice(0, 34).padEnd(36)
            + (p.tokens.project || ''));
        }
        out.push('');
        out.push('The name is whatever the agent last published. namesync has nothing');
        out.push('newer to move, so these stay until the agent updates its own title.');
      });
    } catch { /* herdr unreachable; already reported above */ }

    process.stdout.write(out.join('\n') + '\n');
  },

  async 'dry-run'() {
    await withClient(async (client) => {
      const snapshot = (await client.snapshot()).snapshot;
      const { namer } = await buildNamer(client, { dryRun: true });
      const plans = await namer.buildPlans(snapshot);
      process.stdout.write(plans.map(formatPlan).join('\n') + '\n');
    });
  },

  async 'rename-now'() {
    const only = currentWorkspaceId();
    if (!only) { process.stderr.write('no workspace in context\n'); process.exitCode = 1; return; }
    await runRename(only);
  },

  async 'rename-all'() { await runRename(null); },

  // Re-renders every label namesync owns, ignoring the similarity gate. For
  // when a template or option changed and the existing names would otherwise
  // be skipped as "same intent, only reworded". Locks are still respected.
  async reformat() { await runRename(null, true); },

  /* herdr renders none of namesync's tokens until the sidebar asks for them,
     and `herdr config` has no `set` for a plugin to do it. So: print the
     blocks, and write them only when asked. */
  async setup() {
    const apply = process.argv.includes('--write');
    const { file, action, sections, text } = setup.plan();

    if (action === 'missing') {
      process.stdout.write('no herdr config at ' + file + '\n\n'
        + 'Create it, then add:\n\n' + text);
      return;
    }

    if (action === 'present') {
      process.stdout.write('sidebar rows are already configured in ' + file + '\n'
        + '  found: ' + sections.join(', ') + '\n\n'
        + 'Left alone — an existing layout is yours. For reference, namesync\n'
        + 'publishes $n, $project, $worktree, $branch, $since, $intent,\n'
        + '$agent and $agents. This is what it would have added:\n\n' + text);
      return;
    }

    if (!apply) {
      process.stdout.write('would append to ' + file + ':\n\n' + text
        + '\nnothing changed. re-run with --write to apply.\n');
      return;
    }

    const backup = setup.write(file, text);
    process.stdout.write('appended to ' + file + '\n  backup: ' + backup + '\n');
    try {
      await withClient((client) => client.request('server.reload_config', {}));
      process.stdout.write('  herdr reloaded its config\n');
    } catch (err) {
      process.stdout.write('  reload it yourself: herdr server reload-config'
        + '  (' + err.message + ')\n');
    }
  },

  // Preview by default. Grouping rewrites prefix+shift+N, so it should never
  // happen because someone typed the wrong thing.
  async group() {
    const apply = process.argv.includes('--apply');
    await withClient(async (client) => {
      const { workspaces } = await client.request('workspace.list', {});
      const { ordered, moved, changed } = planOrder(workspaces);

      if (!changed) {
        process.stdout.write('spaces are already grouped by project\n');
        return;
      }

      const width = Math.max(...ordered.map((w) => (w.tokens?.project || '?').length));
      process.stdout.write('proposed order\n');
      ordered.forEach((w, i) => {
        const from = workspaces.findIndex((x) => x.workspace_id === w.workspace_id) + 1;
        const mark = from === i + 1 ? '   ' : ' * ';
        process.stdout.write(mark + String(i + 1).padStart(2) + '  '
          + (w.tokens?.project || '?').padEnd(width) + '  ' + (w.label || '') + '\n');
      });

      process.stdout.write('\n' + moved.length + ' space(s) move; these jump keys change:\n');
      for (const m of moved) {
        process.stdout.write('  prefix+shift+' + m.from + ' -> prefix+shift+' + m.to
          + '   ' + (m.project || '?') + '  ' + m.label + '\n');
      }

      if (!apply) {
        process.stdout.write('\nnothing changed. re-run with --apply to reorder.\n');
        return;
      }
      await applyOrder(client, ordered);
      process.stdout.write('\nreordered ' + ordered.length + ' spaces\n');
    });
  },

  async lock() {
    const id = currentWorkspaceId();
    if (!id) { process.stderr.write('no workspace in context\n'); process.exitCode = 1; return; }
    new Store().lock(id, 'locked by action').save();
    process.stdout.write('locked ' + id + '; its name will be left alone\n');
  },

  async unlock() {
    const id = currentWorkspaceId();
    if (!id) { process.stderr.write('no workspace in context\n'); process.exitCode = 1; return; }
    const store = new Store();
    // Release the workspace AND the agents and tabs inside it. Agent locks are
    // keyed by pane id, so clearing only the workspace key left agent renaming
    // wedged with no way back short of editing state.json.
    store.forget(id).save();
    process.stdout.write('unlocked ' + id + ' and everything in it; it will follow the agent again\n');
  },

  async help() {
    process.stdout.write([
      'namesync - intent-driven names for workspaces, tabs and agents',
      '',
      'Usage: node src/cli.js <command>',
      '',
      '  startup       start the watcher if it is not running (herdr startup hook)',
      '  daemon        run the watcher in the foreground',
      '  start|stop|restart',
      '  setup         show the sidebar rows to add to herdr (--write applies)',
      '  status        show watcher, config and sink state',
      '  dry-run       print what would be renamed, change nothing',
      '  rename-now    rename the current workspace immediately',
      '  rename-all    rename every workspace immediately',
      '  reformat      re-render owned labels after a config change',
      '  group         preview grouping spaces by project (--apply to do it)',
      '  lock|unlock   pin or release the current workspace name',
      '',
    ].join('\n'));
  },
};

async function main() {
  const cmd = process.argv[2] || 'help';
  const fn = COMMANDS[cmd];
  if (!fn) { process.stderr.write('unknown command: ' + cmd + '\n'); process.exitCode = 2; return COMMANDS.help(); }
  try { await fn(); } catch (err) {
    process.stderr.write('namesync: ' + err.message + '\n');
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { COMMANDS, startDaemon, stopDaemon, readPid };
