'use strict';

/* Reading what a pane is showing.
 *
 * herdr can read a pane, and the viewport carries current activity rather than
 * a title set hours ago. Two limits, both measured against 0.8.2:
 *
 *   - every read source caps at roughly the visible rows, because agents run
 *     on the alternate screen and that scrollback never reaches herdr's host
 *     buffer. So this sees what is happening now and nothing of how the
 *     session got here.
 *   - a screenful yields a *location*, not an intent.
 *
 * That second one is why this is not a source. It was built as one, measured
 * against the titles it would have replaced, and lost every case:
 *
 *     "Astro docs site GNU style"        ->  ".worktrees feat narrow by"
 *     "Open source project roadmap CLI"  ->  "Code astralia"
 *     "ptop-adopt-remaining-lessons"     ->  "Code perfect"
 *     "Richard Stallman perspective"     ->  null
 *
 * Two of six produced nothing, and "Code astralia" is a parent directory plus
 * a folder name that is not even the project (that repository is cairn). A
 * source that cannot answer the question should not implement the interface
 * that asks it.
 *
 * What survives is the reading and cleaning, which is exactly the input a
 * summarising source needs. That is what this module is for.
 */

// Chrome an agent TUI draws around its content, none of which is the work.
const CHROME = [
  /^[\s│┃┆┇┊┋]*$/,                    // blank or bare verticals
  /^[─━┄┅┈┉═╌╍\s]{8,}$/,              // rulers
  /^[╭╮╰╯┌┐└┘├┤┬┴┼╔╗╚╝].*$/,          // box corners and joins
  /^\s*[⏵▶▷►]{1,2}\s/,                // mode indicators
  /bypass permissions|shift\+tab|ctrl\+[a-z]|for agents|\/diff|\/rc\b/i,
  /Update installed|Restart to update/i,
  /^\s*❯\s*$/,                        // an empty prompt
];

/* The spinner line: a whimsical verb, an elapsed time, a token count. Says
   that work is happening, never what the work is.

   Matched by shape rather than by glyph. Claude Code cycles through a set of
   sparkle characters wide enough that enumerating them is a losing game -- an
   earlier version listed five and missed the sixth. What is stable is the
   form: a word ending in an ellipsis, followed by a parenthesised duration. */
const ACTIVITY = /^\s*\S{0,2}\s*[A-Za-z]+…\s*\(\s*\d/;

// Claude Code's status line. Worth parsing rather than discarding: it names
// the directory being worked in, which is the one durable fact on screen.
const STATUS = /·\s*(~?[\w./-]*\/[\w./-]+)\s*·/;

function clean(text) {
  return String(text || '')
    // eslint-disable-next-line no-control-regex
    .replace(/\[[0-9;?]*[a-zA-Z]/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() && !ACTIVITY.test(l) && !CHROME.some((re) => re.test(l)))
    .map((l) => l.trim());
}

/* The deepest path fragment the status line mentions, as a phrase. This is the
   honest limit of what a screenful yields without a model: "fontina-cli src ui"
   tells you where an agent is, not what it is doing there. */
function locationFrom(lines) {
  for (const line of lines.slice().reverse()) {
    const m = line.match(STATUS);
    if (!m) continue;
    const parts = m[1].split('/').filter((p) => p && p !== '~' && !p.startsWith('…'));
    const tail = parts.slice(-2).join(' ').replace(/[-_]+/g, ' ').trim();
    if (tail) return tail;
  }
  return '';
}

/* The substantive lines of a pane: chrome, rulers and the spinner removed.
   This is what would be handed to something that can summarise. */
async function readPane(client, paneId, { lines = 60 } = {}) {
  if (!client || !paneId) return { body: [], raw: [] };
  const res = await client.request('pane.read', {
    // The socket takes recent_unwrapped; only the CLI spells it with a hyphen.
    // Same split as the event names.
    pane_id: paneId, source: 'recent_unwrapped', lines,
  });
  // pane.read wraps its payload: { type: "pane_read", read: { text, … } }
  const text = (res && res.read && res.read.text) || '';
  return { body: clean(text), raw: String(text).split('\n') };
}

module.exports = { readPane, clean, locationFrom, CHROME, ACTIVITY, STATUS };
