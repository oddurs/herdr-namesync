'use strict';
const { execFile } = require('child_process');

/* How many pull requests a repository has open, asked of `gh`.

   This is the one lookup that leaves the machine, so it is kept apart from
   the git questions: it runs on its own clock, it is cached per repository
   rather than per directory, and a failure is remembered for as long as a
   success would be. A machine without `gh`, or one that is not logged in,
   must not spawn a process on every sync only to learn that again. */

const pullCache = new Map();

function runGh(cwd) {
  return new Promise((resolve) => {
    execFile('gh', ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number', '--jq', 'length'],
      { cwd, timeout: 8000, env: { ...process.env, GH_NO_UPDATE_NOTIFIER: '1', GH_PROMPT_DISABLED: '1' } },
      (err, stdout) => resolve(err ? null : String(stdout).trim()));
  });
}

/* `root` identifies the repository; `cwd` is any directory inside it, which
   is what `gh` needs to find the remote. Returns a count, or null when the
   answer is unknown -- absent is the honest token for that. */
async function openPullRequests(root, cwd, { now = Date.now(), ttlMs = 300000, exec = runGh } = {}) {
  if (!root) return null;
  const hit = pullCache.get(root);
  if (hit && now - hit.at < ttlMs) return hit.value;
  // Reuse an in-flight lookup: every pane of a repository asks in the same
  // sync, and one answer serves them all.
  if (hit && hit.pending) return hit.pending;

  const pending = exec(cwd || root).then((out) => {
    const n = Number(out);
    const value = out != null && Number.isInteger(n) && n >= 0 ? n : null;
    pullCache.set(root, { at: now, value });
    return value;
  });
  pullCache.set(root, { at: hit ? hit.at : 0, value: hit ? hit.value : null, pending });
  return pending;
}

module.exports = { openPullRequests, pullCache };
