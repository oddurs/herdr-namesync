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
function configPath() {
  if (process.env.HERDR_CONFIG_PATH) return process.env.HERDR_CONFIG_PATH;
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.config', 'herdr', 'config.toml');
}

/* Two lines that age differently: identity on top, live intent underneath.
 * Colour carries the hierarchy rather than repeating it — brightest for the
 * project, muted for the branch, and the accent for what is happening now. */
function blocks({ accent = '#33859d', bright = '#d3ebe9', muted = '#888ba5',
  live = '#599caa', warn = '#edb54b' } = {}) {
  return `# Added by namesync. $project, $branch, $worktree, $since and $n are
# published by the plugin; herdr has no built-in token for any of them.
[ui.sidebar.agents]
rows = [
  ["state_icon", { token = "$n", fg = "${accent}", bold = true }, { token = "$project", fg = "${bright}", bold = true }, { token = "$worktree", fg = "#d26939" }, { token = "$since", fg = "${muted}" }],
  [{ token = "terminal_title_stripped", fg = "${live}" }],
]

[ui.sidebar.spaces]
rows = [
  ["state_icon", { token = "$n", fg = "${accent}", bold = true }, { token = "$project", fg = "${bright}", bold = true }, { token = "$worktree", fg = "#d26939" }, { token = "branch", fg = "${muted}" }, { token = "git_status", fg = "${warn}" }],
  [{ token = "workspace", fg = "${live}" }],
]
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

module.exports = { configPath, blocks, existingSections, plan, write };
