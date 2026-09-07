'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

/* What the person actually asked for.
 *
 * The plan here was a Claude Code Stop hook: a hook receives `transcript_path`,
 * so the user's most recent message is readable, and that is the freshest
 * statement of intent there is. The cost was that it works for one agent and
 * needs a hook installed.
 *
 * No hook is needed. herdr already reports the agent's session id, because its
 * own integration tells it — and that id *is* the transcript filename:
 *
 *   agent_session  { agent: "claude", value: "0c65f350-…-798a89a89d75" }
 *   transcript     ~/.claude/projects/<slug>/0c65f350-…-798a89a89d75.jsonl
 *
 * So this reads through herdr's public API rather than through a hook, and
 * degrades to nothing when the session is not reported — which happens, so it
 * must never be relied upon.
 *
 * One thing it does *not* solve. The last user message is an instruction, not
 * a label:
 *
 *   "disk is freed, fix the stable toolchain and then continue"
 *
 * Fresh, accurate, and not a workspace name. It is a better input for
 * something that summarises than the viewport is — real intent rather than
 * scrollback — but it still needs summarising.
 */

function sessionId(agent) {
  const s = agent && agent.agent_session;
  return s && s.kind === 'id' && typeof s.value === 'string' ? s.value : '';
}

/* Claude Code files transcripts under a per-project directory whose name is
   derived from the path, so the session id is searched for rather than
   computed from the working directory. */
function findTranscript(id, root) {
  if (!id) return '';
  const base = root
    || path.join(process.env.HOME || process.env.USERPROFILE || os.homedir(), '.claude', 'projects');
  let projects;
  try { projects = fs.readdirSync(base); } catch { return ''; }
  for (const project of projects) {
    const candidate = path.join(base, project, id + '.jsonl');
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

/* The last few things the person said, oldest first. Assistant turns are
   ignored: what the user asked for is the intent, and what the agent replied
   is how it went. */
function recentAsks(file, { limit = 3, maxChars = 2000 } = {}) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }

  const asks = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== 'user') continue;
    const content = entry.message && entry.message.content;
    if (typeof content !== 'string') continue;
    const clean = content.trim();
    /* Things that appear as user turns without anyone having said them:
       tool results, injected reminders, interruption markers, and the summary
       Claude Code writes into the transcript when a conversation is compacted.
       That last one is the freshest entry in a long session and describes
       nothing the person asked for. */
    if (!clean
      || clean.startsWith('<')
      || clean.startsWith('[Request interrupted')
      || /^This session is being continued from a previous conversation/i.test(clean)
      || /^Caveat: The messages below were generated/i.test(clean)) continue;
    asks.push(clean.slice(0, maxChars));
  }
  return asks.slice(-limit);
}

// The whole path, for a source that just wants the text.
function readAsks(agent, opts = {}) {
  const file = findTranscript(sessionId(agent), opts.root);
  return file ? recentAsks(file, opts) : [];
}

module.exports = { sessionId, findTranscript, recentAsks, readAsks };
