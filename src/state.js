'use strict';
const fs = require('fs');
const path = require('path');

// Same reasoning as configDir(): the CLI and the herdr-launched watcher must
// agree on where locks and authorship live, or they would disagree about who
// named what.
function stateDir() {
  if (process.env.HERDR_PLUGIN_STATE_DIR) return process.env.HERDR_PLUGIN_STATE_DIR;
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  const managed = path.join(home, '.config', 'herdr', 'plugins', 'state', 'namesync');
  if (fs.existsSync(managed)) return managed;
  return path.join(home, '.local', 'state', 'namesync');
}

// Durable across restarts: which names we authored (so we can tell ours from a
// human's), which workspaces are locked, and when we last touched each one.
class Store {
  constructor(file = path.join(stateDir(), 'state.json')) {
    this.file = file;
    this.data = { authored: {}, locked: {}, lastRenameAt: {}, metadata: {}, stateAt: {}, lastProject: {} };
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { authored: {}, locked: {}, lastRenameAt: {}, metadata: {}, stateAt: {}, lastProject: {}, ...parsed };
    } catch { /* first run, or unreadable: defaults stand */ }
    return this;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      process.stderr.write('namesync: could not persist state: ' + err.message + '\n');
    }
    return this;
  }

  // We only own a name if the live value still matches what we last wrote.
  // If it drifted, a human edited it.
  authored(kind, id) { return this.data.authored[kind + ':' + id]; }
  setAuthored(kind, id, value) {
    this.data.authored[kind + ':' + id] = value;
    return this;
  }

  isLocked(id) { return Boolean(this.data.locked[id]); }
  lock(id, reason = 'manual') { this.data.locked[id] = { reason, at: Date.now() }; return this; }
  unlock(id) { delete this.data.locked[id]; return this; }

  /* When a pane entered the agent state it is in now. Persisted so a watcher
     restart does not reset every agent's clock to zero. */
  stateAt(paneId, status, now = Date.now()) {
    const prev = this.data.stateAt[paneId];
    if (!prev || prev.status !== status) {
      this.data.stateAt[paneId] = { status, at: now };
      return { at: now, changed: true };
    }
    return { at: prev.at, changed: false };
  }

  /* The last project a pane successfully resolved to, so a transient cwd
     cannot downgrade a known project back to a folder name. */
  lastProject(paneId) { return this.data.lastProject[paneId]; }
  setLastProject(paneId, project) { this.data.lastProject[paneId] = project; return this; }

  metadata(id) { return this.data.metadata[id]; }
  setMetadata(id, value) { this.data.metadata[id] = value; return this; }

  lastRenameAt(id) { return this.data.lastRenameAt[id] || 0; }
  markRenamed(id, at = Date.now()) { this.data.lastRenameAt[id] = at; return this; }

  /* Everything keyed to an id, including whatever lived inside it.
     Authorship keys are "kind:id", and a workspace's panes and tabs carry ids
     that START with it ("agent:w1:p1"), so an endsWith match cleared the
     workspace and quietly left its children behind for ever. */
  forget(id) {
    const owns = (candidate) => candidate === id || candidate.startsWith(id + ':');

    for (const bucket of ['locked', 'lastRenameAt', 'stateAt', 'lastProject']) {
      for (const key of Object.keys(this.data[bucket])) {
        if (owns(key)) delete this.data[bucket][key];
      }
    }
    for (const bucket of ['authored', 'metadata']) {
      for (const key of Object.keys(this.data[bucket])) {
        const rest = key.slice(key.indexOf(':') + 1);
        if (owns(rest)) delete this.data[bucket][key];
      }
    }
    return this;
  }

}

module.exports = { Store, stateDir };
