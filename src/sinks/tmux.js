'use strict';
const { execFile } = require('child_process');

function run(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: 5000 }, (err, stdout) => {
      if (err) reject(err); else resolve(String(stdout).trim());
    });
  });
}

// Drives tmux window names. Useful when herdr runs inside tmux (so the tmux
// status bar reflects the focused workspace) and as the sole sink when someone
// uses this without herdr at all.
//
// tmux will not do this on its own: its `automatic-rename` follows the running
// command, not the OSC title, unless you set
//   set -g automatic-rename-format '#{pane_title}'
// This sink writes the name explicitly, so that setting is not required.
function createTmuxSink(cfg = {}) {
  const bin = cfg.bin || 'tmux';
  // A tmux target: a window id like "@3", "session:window", or null to use
  // whichever window is active.
  const target = cfg.target || process.env.TMUX_PANE || null;

  return {
    name: 'tmux',
    // Kinds this sink can actually apply; anything else is declined so the
    // namer never records a rename that did not happen.
    kinds: ['workspace', 'tab'],
    async available() {
      if (!cfg.enabled) return false;
      try { await run(bin, ['-V']); } catch { return false; }
      try { await run(bin, ['list-sessions']); return true; } catch { return false; }
    },
    async apply({ label, tmuxTarget }) {
      const t = tmuxTarget || target;
      const args = t ? ['rename-window', '-t', t, label] : ['rename-window', label];
      await run(bin, args);
      return true;
    },
  };
}

module.exports = { createTmuxSink, run };
