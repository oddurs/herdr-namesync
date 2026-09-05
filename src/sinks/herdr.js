'use strict';

// Applies names through the herdr socket. Names are the only thing written;
// layout, focus and pane contents are never touched.
function createHerdrSink(client) {
  return {
    name: 'herdr',
    // Kinds this sink can actually apply; anything else is declined so the
    // namer never records a rename that did not happen.
    kinds: ['workspace', 'tab', 'agent'],
    available: () => Boolean(client),
    async apply({ kind, id, label }) {
      switch (kind) {
        case 'workspace':
          await client.request('workspace.rename', { workspace_id: id, label });
          return true;
        case 'tab':
          await client.request('tab.rename', { tab_id: id, label });
          return true;
        case 'agent':
          // `target` is a pane id or a live agent name; we always pass the pane.
          await client.request('agent.rename', { target: id, name: label });
          return true;
        default:
          return false;
      }
    },

    // Display-only tokens for the sidebar. Never affects a label.
    // Space rows read workspace metadata; Agent rows read pane metadata.
    async reportMetadata(kind, id, tokens) {
      if (kind === 'pane') {
        await client.request('pane.report_metadata', {
          pane_id: id, source: 'namesync', tokens,
        });
      } else {
        await client.request('workspace.report_metadata', {
          workspace_id: id, source: 'namesync', tokens,
        });
      }
      return true;
    },
  };
}

module.exports = { createHerdrSink };
