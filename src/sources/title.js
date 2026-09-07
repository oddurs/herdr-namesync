'use strict';
const { normalize } = require('../naming');

/* The agent's own terminal title.
 *
 * Free, instant, and works with every agent kind herdr detects, because it is
 * whatever herdr already reports for the pane. It is the default and should
 * stay the default.
 *
 * Its one weakness is the reason the source interface exists at all: agents
 * set a title early in a session and rarely revise it, so on a long session
 * this describes work that finished hours ago. `$stale` is how namesync
 * notices; another source is what it falls back to.
 */
function createTitleSource() {
  return {
    name: 'title',
    // Nothing to check: if herdr reported the agent, it reported the title.
    available: () => true,
    async observe({ agent }) {
      return normalize(agent.terminal_title_stripped || agent.terminal_title || '');
    },
  };
}

module.exports = { createTitleSource };
