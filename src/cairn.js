'use strict';
const fs = require('fs');
const path = require('path');

/* When the work is a tracked item, the item is the description.
 *
 * A person who says "do 0042" or "finish v0.3" has already named the work
 * more precisely than a model condensing their sentence ever will, and the
 * agent working a backlog says the id on screen every time it claims one.
 * So a cairn reference in the freshest context supersedes the model: the
 * line becomes the item's own title, resolved from the repository's item
 * files, and nothing is asked of anyone.
 *
 * Read from disk rather than through the cairn binary: the files are the
 * source of truth, the binary may be absent or refuse an old format, and a
 * sidebar tick must not spawn a process per pane. */

const CACHE_TTL_MS = 60000;
const cache = new Map();

// Where the items live, from cairn.toml, or cairn's default.
function itemsDir(root) {
  let dir = 'cairn/items';
  try {
    const toml = fs.readFileSync(path.join(root, 'cairn.toml'), 'utf8');
    const m = /^\s*dir\s*=\s*"([^"]+)"/m.exec(toml);
    if (m) dir = m[1];
  } catch { /* no cairn.toml: not a cairn project unless the default dir exists */ }
  return path.join(root, dir);
}

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/* Every item in a repository, by id and by milestone key. Cached briefly:
   items change when someone edits them, not between two syncs. */
function items(root, now = Date.now()) {
  if (!root) return null;
  const hit = cache.get(root);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  const dir = itemsDir(root);
  let names;
  try { names = fs.readdirSync(dir); } catch { names = null; }
  let value = null;
  if (names) {
    value = { byId: new Map(), byKey: new Map(), width: 0 };
    for (const name of names) {
      const m = /^(\d+)-.*\.md$/.exec(name);
      if (!m) continue;
      let fm;
      try { fm = frontmatter(fs.readFileSync(path.join(dir, name), 'utf8')); } catch { continue; }
      if (!fm.title) continue;
      const id = Number(fm.id != null ? fm.id : m[1]);
      const item = { id, padded: m[1], title: fm.title, key: fm.key || '', type: fm.type || '' };
      value.width = Math.max(value.width, m[1].length);
      value.byId.set(id, item);
      if (item.key) value.byKey.set(item.key.toLowerCase(), item);
    }
  }
  cache.set(root, { at: now, value });
  return value;
}

/* The item a piece of text is about, if any. An item reference beats a
   milestone one: the item is the more specific claim. Within each, the ask
   comes first and the last mention on screen wins, because an agent working
   through a backlog names the current item most recently. */
const ITEM_REF = /(?:\bcairn\s+(?:claim|show|set|close|release|next|start)\s+|\bitems?\s*#?\s*|\b(?:refs?|fixes|closes)[:\s]+#?|\bid\s*[:=]?\s*|\b)(0\d{2,}|\d{3,})\b/gi;
/* A version-shaped word is a milestone key only when the backlog has it --
   and on screen, only when the word "milestone" is in front of it, because a
   screen says "herdr v0.9.1" and "v1.0 launch" all day. In the ask, the bare
   key is trusted: "finish v0.3" is how a person says it. */
const MILESTONE_REF = /\b(?:milestone\s+)?(v\d+(?:\.\d+)+)\b/gi;
const MILESTONE_REF_STRICT = /\bmilestone\s+(v\d+(?:\.\d+)+)\b/gi;

function lastMatch(re, text) {
  let found = null;
  for (const m of text.matchAll(re)) found = m[1];
  return found;
}

function itemIn(index, text) {
  const ref = text && lastMatch(ITEM_REF, text);
  return (ref && index.byId.get(Number(ref))) || null;
}

function milestoneIn(index, text, { strict = false } = {}) {
  const ref = text && lastMatch(strict ? MILESTONE_REF_STRICT : MILESTONE_REF, text);
  return (ref && index.byKey.get(ref.toLowerCase())) || null;
}

/* The line to show for a pane, or empty. `ask` is what the person said,
   `screen` what the agent shows. An item anywhere beats a milestone
   anywhere, and within each the ask is trusted before the screen. */
function cairnLine(root, { ask = '', screen = '' } = {}, now = Date.now()) {
  const index = items(root, now);
  if (!index) return '';
  const item = itemIn(index, ask) || itemIn(index, screen)
    || milestoneIn(index, ask) || milestoneIn(index, screen, { strict: true });
  if (!item) return '';
  return (item.key || item.padded) + ' ' + item.title;
}

module.exports = { cairnLine, items, itemIn, milestoneIn, frontmatter, cache };
