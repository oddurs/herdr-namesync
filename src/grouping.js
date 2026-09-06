'use strict';

/* Ordering spaces so a project's workspaces sit together.
 *
 * herdr derives a workspace's number from its position, and that number is what
 * prefix+shift+N jumps to. Reordering therefore rewrites your jump keys, which
 * is why this never runs on its own — it is an explicit, previewable action.
 *
 * The payoff is that afterwards the numbers mean something: a project occupies
 * a contiguous block instead of being scattered through creation order.
 *
 * Three properties the ordering has to have, or it is not worth doing:
 *
 *   idempotent       running it twice changes nothing
 *   minimal-movement projects keep their existing relative order, so only
 *                    stragglers move; the block does not jump to the top
 *   predictable      a project sits where its earliest member already was
 */

// Spaces with no detected project are their own group, keyed by id, so they
// stay exactly where they are instead of being herded into one lump.
function groupKey(ws) {
  const project = ws.tokens && ws.tokens.project;
  return project ? 'p:' + project : 'w:' + ws.workspace_id;
}

function isWorktree(ws) {
  return Boolean(ws.tokens && ws.tokens.worktree);
}

/* A workspace another plugin has claimed for itself.
   herdr's tokens are a single flat map with no per-source layering: two
   sources writing one key overwrite each other, and either can clear it. A
   plugin that brands a workspace through tokens -- smali's dashboard writes
   `project` and `n` to draw its own row -- would be silently overwritten.
   `role` is the marker such a plugin sets; it means hands off. */
function isClaimed(ws) {
  return Boolean(ws && ws.tokens && ws.tokens.role);
}

/**
 * @param {Array} workspaces herdr's ordered workspace list
 * @returns {{ordered: Array, moved: Array, changed: boolean}}
 */
function planOrder(workspaces) {
  const position = new Map(workspaces.map((w, i) => [w.workspace_id, i]));

  // A project ranks where its earliest member currently sits. This is what
  // keeps the result stable and the movement small.
  const rank = new Map();
  workspaces.forEach((w, i) => {
    const key = groupKey(w);
    if (!rank.has(key)) rank.set(key, i);
  });

  const byGroup = (a, b) => {
    const byProject = rank.get(groupKey(a)) - rank.get(groupKey(b));
    if (byProject !== 0) return byProject;

    // Inside a project, the main checkout leads and worktrees follow it,
    // mirroring how herdr already nests worktrees it created itself.
    const byWorktree = Number(isWorktree(a)) - Number(isWorktree(b));
    if (byWorktree !== 0) return byWorktree;

    return position.get(a.workspace_id) - position.get(b.workspace_id);
  };

  /* A claimed workspace holds its exact position. A dashboard is furniture:
     you learn where it is and reach for it there, so sorting it around by
     whatever project it happens to report would be worse than leaving the
     spaces ungrouped. Only the remaining slots are reordered. */
  const pinned = new Map();
  const movable = [];
  workspaces.forEach((w, i) => {
    if (isClaimed(w)) pinned.set(i, w);
    else movable.push(w);
  });

  movable.sort(byGroup);

  const ordered = [];
  let next = 0;
  for (let i = 0; i < workspaces.length; i += 1) {
    ordered.push(pinned.has(i) ? pinned.get(i) : movable[next++]);
  }

  const moved = ordered
    .map((w, i) => ({
      workspace_id: w.workspace_id,
      label: w.label,
      project: (w.tokens && w.tokens.project) || '',
      from: position.get(w.workspace_id) + 1,
      to: i + 1,
    }))
    .filter((m) => m.from !== m.to);

  return { ordered, moved, changed: moved.length > 0 };
}

// One atomic call: passing every id in the desired order with no anchor moves
// the whole block to the end, which is exactly the ordering we want.
async function applyOrder(client, ordered) {
  await client.request('workspace.move_block', {
    workspace_ids: ordered.map((w) => w.workspace_id),
  });
  return ordered.length;
}

module.exports = { planOrder, applyOrder, groupKey, isWorktree, isClaimed };
