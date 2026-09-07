'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

/* Reading secrets from a file, because the watcher is not a shell child.
 *
 * The daemon inherits its environment once, at spawn. Export a key in a
 * terminal and a daemon that is already running never sees it; worse, when
 * herdr's startup hook launches namesync at login the daemon inherits herdr's
 * environment, which under launchd is not the user's. The symptom is a plugin
 * that works when you set it up and is keyless the next morning.
 *
 * So there is a file. It is read at startup and never overrides a variable
 * that is already set, because a value the user exported deliberately in this
 * shell should beat one they wrote down last month.
 */

const DEFAULT_FILE = () => path.join(
  process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || os.homedir(), '.config'),
  'namesync', 'env');

/* Deliberately not a shell. `export K=V`, `K=V`, comments and blank lines --
   no interpolation, no command substitution, no line continuations. A file
   that needs those is a file that should be sourced by a shell instead. */
function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function loadEnvFile(file, env = process.env) {
  const target = file || DEFAULT_FILE();
  let text;
  try { text = fs.readFileSync(target, 'utf8'); } catch { return []; }
  const loaded = [];
  for (const [key, value] of Object.entries(parseEnv(text))) {
    // The shell wins. This fills gaps, it does not overrule.
    if (env[key] != null && env[key] !== '') continue;
    env[key] = value;
    loaded.push(key);
  }
  return loaded;
}

module.exports = { loadEnvFile, parseEnv, DEFAULT_FILE };
