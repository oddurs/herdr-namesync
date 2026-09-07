'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

/* Making the sidebar show what namesync publishes.
 *
 * This exists because of a gap: namesync publishes $project, $branch, $since
 * and $n, and herdr renders none of them until someone edits
 * [ui.sidebar.agents] and [ui.sidebar.spaces] by hand. `herdr config` offers
 * only `check` and `reset-keys` — there is no `set` — so a plugin cannot make
 * that edit through the API. Without this command, installing namesync
 * changes nothing visible and looks broken.
 *
 * The blocks are printed by default and only written when asked, because
 * appending to someone's config file is not a thing to do quietly.
 */

// herdr's own resolution order.
/* Fences, so the block can be taken back out again.
 *
 * A plugin that edits the host's configuration is a guest rearranging the
 * furniture, and the least it can do is remember which pieces it moved. These
 * markers are what make `setup --undo` surgical rather than a wholesale
 * restore of a backup that may be older than the user's other edits. */
const BEGIN = '# >>> namesync begin (managed block -- `namesync setup --undo` removes it)';
const END = '# <<< namesync end';

// The block as written, fences included, so it can be located exactly.
function managedBlock(toml) {
  const from = toml.indexOf(BEGIN);
  if (from === -1) return null;
  const to = toml.indexOf(END, from);
  if (to === -1) return null;
  return { from, to: to + END.length };
}

function configPath() {
  if (process.env.HERDR_CONFIG_PATH) return process.env.HERDR_CONFIG_PATH;
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.config', 'herdr', 'config.toml');
}

/* Two lines that age differently: identity on top, live intent underneath.
 * Colour carries the hierarchy rather than repeating it — brightest for the
 * project, muted for the branch, and the accent for what is happening now. */
function blocks({ accent = '#33859d', bright = '#d3ebe9', muted = '#888ba5',
  live = '#599caa', warn = '#edb54b', held = '#d26939' } = {}) {
  return `${BEGIN}
# Added by namesync. $project, $branch, $worktree, $locked, $since and $n are
# published by the plugin; herdr has no built-in token for any of them.
# $locked marks a name namesync has been told to leave alone; $stale marks
# one the agent appears to have stopped maintaining. $since is time in the
# current agent state; $age is how long the intent has been the current one.
[ui.sidebar.agents]
rows = [
  ["state_icon", { token = "$n", fg = "${accent}", bold = true }, { token = "$project", fg = "${bright}", bold = true }, { token = "$worktree", fg = "${held}" }, { token = "$locked", fg = "${held}" }, { token = "$stale", fg = "${muted}" }, { token = "$since", fg = "${muted}" }],
  [{ token = "terminal_title_stripped", fg = "${live}" }],
]

[ui.sidebar.spaces]
rows = [
  ["state_icon", { token = "$n", fg = "${accent}", bold = true }, { token = "$project", fg = "${bright}", bold = true }, { token = "$worktree", fg = "${held}" }, { token = "$locked", fg = "${held}" }, { token = "branch", fg = "${muted}" }, { token = "git_status", fg = "${warn}" }, { token = "$age", fg = "${muted}" }],
  [{ token = "workspace", fg = "${live}" }],
]
${END}
`;
}

// Only the section headers matter: a row list already present is the user's,
// and overwriting it would be worse than printing and letting them decide.
function existingSections(toml) {
  const found = [];
  for (const section of ['ui.sidebar.agents', 'ui.sidebar.spaces']) {
    const header = new RegExp('^\\s*\\[' + section.replace(/\./g, '\\.') + '\\]\\s*$', 'm');
    if (header.test(toml)) found.push(section);
  }
  return found;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

/* Decides what `setup` should do without touching anything, so the same
 * function backs both the preview and the write. */
function plan(file = configPath(), opts = {}) {
  const toml = read(file);
  if (toml === null) {
    return { file, action: 'missing', sections: [], text: blocks(opts) };
  }
  /* Ours already, so there is nothing to do and nothing to warn about.
     Checked before the section scan, since our own block contains those very
     sections and would otherwise look like the user's work. */
  if (managedBlock(toml)) {
    return { file, action: 'installed', sections: [], text: blocks(opts) };
  }
  const sections = existingSections(toml);
  if (sections.length) return { file, action: 'present', sections, text: blocks(opts) };
  return { file, action: 'append', sections: [], text: blocks(opts) };
}

// Backed up first, and never in place: a config file is not ours to lose.
function write(file, text) {
  const backup = file + '.bak-namesync';
  fs.copyFileSync(file, backup);
  fs.appendFileSync(file, (fs.readFileSync(file, 'utf8').endsWith('\n') ? '\n' : '\n\n') + text);
  return backup;
}

/* Takes back exactly what was added and leaves the rest alone -- including
   edits made inside our own block, which are the user's and are removed with
   it rather than silently preserved somewhere they no longer apply. */
function undo(file = configPath()) {
  const toml = read(file);
  if (toml === null) return { file, action: 'missing' };
  const at = managedBlock(toml);
  if (!at) {
    /* Written by a setup that predates the fences. The block's extent cannot
       be known -- it may have been edited since -- so this says where it is
       rather than guessing where it ends. Removing the wrong lines from
       someone's config is worse than asking them to do it. */
    if (/^# Added by namesync\./m.test(toml)) {
      const line = toml.slice(0, toml.search(/^# Added by namesync\./m)).split('\n').length;
      return { file, action: 'legacy', line };
    }
    return { file, action: 'absent' };
  }
  const backup = file + '.bak-namesync';
  fs.copyFileSync(file, backup);
  const before = toml.slice(0, at.from).replace(/\n+$/, '\n');
  const after = toml.slice(at.to).replace(/^\n+/, '');
  fs.writeFileSync(file, after ? before + after : before);
  return { file, action: 'removed', backup };
}

module.exports = { configPath, blocks, existingSections, plan, write, undo, managedBlock, BEGIN, END };
