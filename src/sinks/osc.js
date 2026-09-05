'use strict';
const fs = require('fs');

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);

// Writes an OSC 2 window-title sequence to a tty.
//
// Ghostty, WezTerm, kitty and iTerm2 already take their tab titles from the OSC
// title the coding agent emits, so for a pane running Claude Code this is
// redundant and stays off by default. It exists for the other direction:
// pushing a chosen name onto a terminal that is NOT running an agent, by
// pointing `device` at that terminal's tty.
function createOscSink(cfg = {}) {
  return {
    name: 'osc',
    // Kinds this sink can actually apply; anything else is declined so the
    // namer never records a rename that did not happen.
    kinds: ['workspace', 'tab'],
    available: () => Boolean(cfg.enabled && cfg.device),
    async apply({ label }) {
      // Strip control bytes so a title can never smuggle its own escape.
      const safe = String(label).replace(/[\u0000-\u001f\u007f]/g, '');
      await fs.promises.writeFile(cfg.device, ESC + ']2;' + safe + BEL);
      return true;
    },
  };
}

module.exports = { createOscSink, ESC, BEL };
