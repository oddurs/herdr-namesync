'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  enabled: true,

  // How long the intent must hold still before we commit a rename. Coding
  // agents rewrite their title several times early in a turn; this waits for
  // the churn to settle instead of chasing every revision.
  debounceMs: 2500,

  // Floor between two renames of the same workspace, so a fast-moving session
  // cannot strobe the sidebar.
  minRenameIntervalMs: 30000,

  // 0..1 token overlap above which a new intent counts as "the same thing,
  // reworded" and is skipped. Raise it to rename more eagerly.
  similarityThreshold: 0.6,

  // Never overwrite a name a human set by hand. This is what keeps the plugin
  // from fighting you; clear it per workspace with the `unlock` action.
  respectManualNames: true,

  // Don't rename while the agent is waiting on an approval dialog: the title
  // at that moment describes the question, not the work.
  skipWhileBlocked: true,

  targets: { workspace: true, tab: false, agent: true },

  /* Flag a title the agent appears to have stopped maintaining. namesync moves
     a name it does not write, so it inherits whatever the agent publishes --
     and agents tend to set a title early and not revise it. A title unchanged
     across this many state transitions is probably describing work that
     finished a while ago. Never acted on, only reported. */
  showStale: true,
  staleAfterTurns: 6,

  // Publish $since: how long an agent has been in its current state. This is
  // the one thing here that needs a clock — herdr reports state changes with a
  // sequence number, not a timestamp, so elapsed time has to be observed. The
  // refresh below is the only timer in the plugin.
  showDuration: true,
  durationRefreshMs: 30000,

  // Drop a leading project name from the workspace label, since the sidebar
  // already shows the project on its own line.
  stripProjectPrefix: true,

  // herdr's metadata is one flat map per workspace: last writer wins, and any
  // source can clear another's key. A workspace another plugin has claimed
  // with a `role` token is therefore left alone entirely — naming it would
  // overwrite that plugin's own labelling.
  respectPluginRoles: true,

  // Publish $n, $project, $worktree, $branch, $intent, $agent and $agents to the herdr
  // sidebar as display-only tokens, so a two-line row can show the project on
  // one line and the live intent on the other.
  metadata: { enabled: true },

  // {intent} {intent-slug} {project} {repo} {branch} {agent} {n}
  templates: {
    workspace: '{intent}',
    tab: '{intent}',
    agent: '{intent-slug}',
  },

  // A workspace holding more than one agent has no single intent. "tab" names
  // each tab instead and leaves the workspace label alone; "skip" does nothing;
  // "focused" uses whichever agent is focused.
  multiAgent: 'tab',

  // herdr is the only sink; the multiplexer-agnostic framing was dropped
  // rather than fixed, because only bare renaming ever ported.
  sinks: {
    herdr: { enabled: true },
  },

  // Titles that carry no intent. Matched case-insensitively against the whole
  // title after trimming.
  ignoreTitles: [
    'claude', 'claude code', 'codex', 'pi', 'copilot', 'cursor', 'droid',
    'bash', 'zsh', 'fish', 'sh', 'nu', 'pwsh', 'powershell',
    'nvim', 'vim', 'nano', 'helix', 'hx', 'emacs', 'less', 'man',
    'node', 'python', 'irb', 'psql', 'lazygit', 'htop', 'top', 'btop',
  ],

  logLevel: 'info',
};

function deepMerge(base, override) {
  if (override === undefined) return base;
  // A scalar or null must not replace an object-shaped default: "targets": null
  // would then throw on every sync and silence the plugin with only a log line.
  if (base !== null && typeof base === 'object' && !Array.isArray(base)
      && (override === null || typeof override !== 'object' || Array.isArray(override))) {
    return base;
  }
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return override;
  }
  const out = Array.isArray(base) ? [...base] : { ...base };
  // Always recurse for a known key, so the object/scalar guard above applies
  // to nested values too. Assigning v directly here bypassed it for null.
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out;
}

const PLUGIN_ID = 'namesync';

// herdr injects HERDR_PLUGIN_CONFIG_DIR when it launches us, but a human
// running the CLI by hand has no such variable. Fall back to the same
// herdr-managed directory so both paths read one file.
function configDir() {
  if (process.env.HERDR_PLUGIN_CONFIG_DIR) return process.env.HERDR_PLUGIN_CONFIG_DIR;
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  const managed = path.join(home, '.config', 'herdr', 'plugins', 'config', PLUGIN_ID);
  if (fs.existsSync(managed)) return managed;
  return path.join(home, '.config', PLUGIN_ID);
}

function configPath() {
  return path.join(configDir(), 'config.json');
}

// Reloaded on every read so edits take effect without a restart.
function load() {
  const p = configPath();
  try {
    return deepMerge(DEFAULTS, JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write('namesync: ignoring bad config at ' + p + ': ' + err.message + '\n');
    }
    return { ...DEFAULTS };
  }
}

module.exports = { load, configPath, configDir, DEFAULTS, deepMerge, PLUGIN_ID };
