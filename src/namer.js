'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { render, slugify, uniqueAgentName, normalize, stripProject, formatSince,
  AGENT_NAME_MAX } = require('./naming');
const { decide } = require('./policy');
const { isClaimed } = require('./grouping');
const { createTitleSource, observe } = require('./sources');

function git(cwd, args) {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { timeout: 3000 },
      (err, stdout) => resolve(err ? null : String(stdout).trim()));
  });
}

const gitBranch = (cwd) => git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);

/* Git answers are cached per directory. A sync resolves project and branch for
   every workspace, and buildPlans and publishMetadata each ask, so without this
   a single title change spawns two processes per workspace twice over.
   The TTL keeps a branch switch visible within a few seconds. */
const GIT_TTL_MS = 15000;
const gitCache = new Map();

async function gitInfo(cwd, now = Date.now()) {
  if (isUselessCwd(cwd)) return { project: '', branch: '', worktree: false };
  const hit = gitCache.get(cwd);
  if (hit && now - hit.at < GIT_TTL_MS) return hit.value;

  const [project, branch, gitDir, commonDir] = await Promise.all([
    detectProject(cwd),
    gitBranch(cwd),
    git(cwd, ['rev-parse', '--path-format=absolute', '--git-dir']),
    git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
  ]);
  // A linked worktree has its own git dir but shares the common one. Worth
  // surfacing: three rows reading "fontina · main" are otherwise identical.
  const worktree = Boolean(gitDir && commonDir && gitDir !== commonDir);
  const value = { project: project || '', branch: branch || '', worktree };
  gitCache.set(cwd, { at: now, value });

  // Bounded: one entry per working directory in the session.
  if (gitCache.size > 256) {
    for (const k of gitCache.keys()) {
      gitCache.delete(k);
      if (gitCache.size <= 128) break;
    }
  }
  return value;
}

// Files that mark the root of a project when git cannot answer.
const PROJECT_MARKERS = [
  '.git', 'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile', 'composer.json',
  'deno.json', 'deno.jsonc', 'mix.exs', 'Package.swift', 'herdr-plugin.toml',
];

// Walks up until something says "a project starts here", stopping at the home
// directory or the filesystem root. Without this, an agent sitting in a
// subdirectory of a non-git project reports the subdirectory's name.
function findProjectRoot(from) {
  const stop = path.parse(from).root;
  const home = process.env.HOME || process.env.USERPROFILE;
  let dir = from;
  for (let i = 0; i < 24; i += 1) {
    if (PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    if (dir === stop || dir === home) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// "git@github.com:oddurs/fontina.git" and
// "https://github.com/oddurs/bedreader.git" both yield the repository name.
function repoNameFromUrl(url) {
  if (!url) return '';
  const cleaned = String(url).trim().replace(/\/+$/, '').replace(/\.git$/i, '');
  const last = cleaned.split(/[/:]/).filter(Boolean).pop() || '';
  return /^[\w.-]+$/.test(last) ? last : '';
}

function readJsonName(file) {
  try {
    const name = JSON.parse(fs.readFileSync(file, 'utf8')).name;
    // Strip an npm scope: "@acme/widget" is the widget project.
    return typeof name === 'string' ? name.split('/').pop() : '';
  } catch { return ''; }
}

function readTomlName(file, section) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const block = section
      ? (text.split(new RegExp('^\\[' + section + '\\]\\s*$', 'm'))[1] || '')
      : text;
    const m = block.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    return m ? m[1] : '';
  } catch { return ''; }
}

// What the project calls itself, when it says so.
function manifestName(root) {
  const at = (f) => path.join(root, f);
  if (fs.existsSync(at('package.json'))) {
    const n = readJsonName(at('package.json'));
    if (n) return n;
  }
  for (const [file, section] of [['Cargo.toml', 'package'], ['pyproject.toml', 'project']]) {
    if (fs.existsSync(at(file))) {
      const n = readTomlName(at(file), section);
      if (n) return n;
    }
  }
  if (fs.existsSync(at('deno.json'))) {
    const n = readJsonName(at('deno.json'));
    if (n) return n;
  }
  if (fs.existsSync(at('go.mod'))) {
    try {
      const m = fs.readFileSync(at('go.mod'), 'utf8').match(/^module\s+(\S+)/m);
      // "github.com/oddurs/widgets/v2" is the widgets project, not "v2".
      if (m) return m[1].replace(/\/v\d+$/, '').split('/').pop();
    } catch { /* fall through */ }
  }
  return '';
}

// The repository's own name, not the directory it happens to sit in.
//
// A checkout is frequently named something other than the project: unifont/
// holds fontina, perfect/ holds ptop, astralia/ holds cairn. The remote is the
// project's identity, so it wins; then whatever the project declares about
// itself; only then the folder.
// A directory that tells us nothing. Panes report "/" while a command is
// starting, and naming a project after the filesystem root helps nobody.
function isUselessCwd(dir) {
  if (!dir || dir === '/' || dir === '.') return true;
  const home = process.env.HOME || process.env.USERPROFILE;
  return Boolean(home && dir === home);
}

// origin first, then upstream, then whatever exists. A clone with only an
// "upstream" remote, or a fork whose canonical name lives there, would
// otherwise fall through to the folder.
async function remoteName(cwd) {
  const direct = repoNameFromUrl(await git(cwd, ['remote', 'get-url', 'origin']));
  if (direct) return direct;

  const listed = (await git(cwd, ['remote'])) || '';
  const remotes = listed.split('\n').map((r) => r.trim()).filter(Boolean);
  const ordered = [
    ...remotes.filter((r) => r === 'upstream'),
    ...remotes.filter((r) => r !== 'upstream' && r !== 'origin'),
  ];
  for (const remote of ordered) {
    const name = repoNameFromUrl(await git(cwd, ['remote', 'get-url', remote]));
    if (name) return name;
  }
  return '';
}

async function detectProject(cwd) {
  if (isUselessCwd(cwd)) return '';

  const fromRemote = await remoteName(cwd);
  if (fromRemote) return fromRemote;

  // Worktree-aware: the common dir points back at the repo a linked worktree
  // belongs to, rather than at the worktree directory.
  // --git-common-dir returns ".../<repo>/.git", and for a linked worktree it
  // returns the MAIN repo's .git, which is exactly what we want. The repo is
  // its parent — stripping ".git" and then taking dirname climbs one too far.
  let root = null;
  const common = await git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (common) root = path.basename(common) === '.git' ? path.dirname(common) : common;
  if (!root) {
    const top = await git(cwd, ['rev-parse', '--show-toplevel']);
    root = top || findProjectRoot(cwd);
  }

  if (root) {
    /* The root can be a different directory from the one probed -- a deleted
       worktree walks up to the repository it belonged to -- and that directory
       may well have a remote even though the original path could not be
       queried. Ask it, rather than settling for its folder name: the folder is
       the last resort, not a shortcut past the rest of the chain. */
    if (root !== cwd) {
      const fromRoot = await remoteName(root);
      if (fromRoot) return fromRoot;
    }
    const declared = manifestName(root);
    if (declared) return declared;
    return path.basename(root);
  }
  return path.basename(cwd);
}

// A herdr snapshot indexed the way the namer needs to read it.
function index(snapshot) {
  const workspaces = new Map((snapshot.workspaces || []).map((w) => [w.workspace_id, w]));
  const tabs = new Map((snapshot.tabs || []).map((t) => [t.tab_id, t]));
  const agents = snapshot.agents || [];
  const byWorkspace = new Map();
  for (const a of agents) {
    if (!byWorkspace.has(a.workspace_id)) byWorkspace.set(a.workspace_id, []);
    byWorkspace.get(a.workspace_id).push(a);
  }
  const panes = new Map((snapshot.panes || []).map((p) => [p.pane_id, p]));
  const liveAgentNames = new Set(agents.map((a) => a.name).filter(Boolean));
  return { workspaces, tabs, panes, agents, byWorkspace, liveAgentNames };
}

// Picks the one agent whose intent should name a workspace, or null when the
// workspace is genuinely ambiguous.
function leadAgent(agentsInWorkspace, mode) {
  if (agentsInWorkspace.length === 1) return agentsInWorkspace[0];
  if (mode === 'focused') return agentsInWorkspace.find((a) => a.focused) || null;
  return null;
}

class Namer {
  constructor({ cfg, store, sinks, sources, client, log = () => {} }) {
    this.cfg = cfg;
    this.store = store;
    this.sinks = sinks;
    /* Where names come from. Defaults to the agent's own title, which is what
       namesync has always used and what it should keep using while it works. */
    this.sources = sources && sources.length ? sources : [createTitleSource()];
    this.client = client || null;
    this.log = log;
  }

  async buildPlans(snapshot, { only, force = false } = {}) {
    const cfg = this.cfg;
    const idx = index(snapshot);
    this.panes = idx.panes;
    const plans = [];
    const takenNames = new Set(idx.liveAgentNames);

    for (const [workspaceId, agentsHere] of idx.byWorkspace) {
      if (only && only !== workspaceId) continue;
      const ws = idx.workspaces.get(workspaceId);
      if (!ws) continue;
      if (cfg.respectPluginRoles && isClaimed(ws)) continue;

      const multi = agentsHere.length > 1;
      const lead = leadAgent(agentsHere, cfg.multiAgent);

      // Name the agents themselves regardless of ambiguity: each one has its
      // own intent, so there is nothing to disambiguate.
      if (cfg.targets.agent) {
        for (const agent of agentsHere) {
          const vars = await this.#vars(agent, ws);
          if (!vars) continue;
          const desired = uniqueAgentName(
            slugify(render(cfg.templates.agent, vars), AGENT_NAME_MAX),
            new Set([...takenNames].filter((n) => n !== agent.name)),
          );
          plans.push(this.#plan('agent', agent.pane_id, agent.name || '', desired, vars, agent, force));
          if (desired) takenNames.add(desired);
        }
      }

      // "skip" is documented as affecting the workspace label only; agents
      // each have their own intent and are named above regardless.
      if (multi && cfg.multiAgent === 'skip') continue;

      // The workspace label needs a single intent. With several agents in one
      // workspace, fall back to naming each tab instead of picking a winner.
      if (multi && cfg.multiAgent === 'tab') {
        if (!cfg.targets.tab && !cfg.targets.workspace) continue;
        for (const agent of agentsHere) {
          const vars = await this.#vars(agent, ws);
          if (!vars) continue;
          plans.push(this.#plan('tab', agent.tab_id,
            idx.tabs.get(agent.tab_id)?.label || '',
            render(cfg.templates.tab, vars), vars, agent, force));
        }
        continue;
      }

      if (!lead) continue;
      const vars = await this.#vars(lead, ws);
      if (!vars) continue;

      if (cfg.targets.workspace) {
        // "ptop-adopt-remaining-lessons" under a row already labelled "ptop"
        // spends half the sidebar's width saying the same thing twice.
        const label = cfg.stripProjectPrefix
          ? stripProject(render(cfg.templates.workspace, vars), vars.project)
          : render(cfg.templates.workspace, vars);
        plans.push(this.#plan('workspace', workspaceId, ws.label || '', label, vars, lead, force));
      }
      if (cfg.targets.tab) {
        plans.push(this.#plan('tab', lead.tab_id, idx.tabs.get(lead.tab_id)?.label || '',
          render(cfg.templates.tab, vars), vars, lead, force));
      }
    }

    // Two agents sharing a tab would otherwise emit two plans for the same
    // tab id, renaming it twice and recording authorship that does not match
    // what herdr kept.
    const seen = new Set();
    return plans.filter((p) => {
      if (!p) return false;
      const key = p.kind + ':' + p.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async #vars(agent, ws) {
    /* Asking rather than reading. The answer is still the terminal title by
       default; the difference is that `Namer` no longer knows that. */
    const { intent } = await observe(this.sources, {
      agent,
      pane: this.panes ? this.panes.get(agent.pane_id) : undefined,
      client: this.client,
      cfg: this.cfg,
    }, this.log);
    if (!intent) return null;
    /* The foreground process's directory is the more accurate of the two — it
       follows an agent into a worktree — but it is also transient: a pane
       reports "/" while a command starts, and a stray `cd /tmp` would rename
       the project to "tmp". So try it, fall back to the pane's own cwd, and
       failing both keep the last project this pane resolved to. A project does
       not stop being true because a shell wandered. */
    const candidates = [agent.foreground_cwd, agent.cwd].filter((c) => !isUselessCwd(c));
    let cwd = '';
    let info = { project: '', branch: '', worktree: false };
    for (const candidate of candidates) {
      const resolved = await gitInfo(candidate);
      if (resolved.project) { cwd = candidate; info = resolved; break; }
      if (!cwd) { cwd = candidate; info = resolved; }
    }

    let { project, branch, worktree } = info;
    if (project) {
      this.store.setLastProject(agent.pane_id, project);
    } else {
      project = this.store.lastProject(agent.pane_id) || '';
    }
    const repo = cwd ? path.basename(cwd) : '';
    return {
      intent,
      'intent-slug': slugify(intent, AGENT_NAME_MAX),
      project: project || repo,
      repo,
      dirName: repo,
      branch: branch || '',
      worktree: worktree ? 'worktree' : '',
      // Both directories, because detection may resolve either and herdr may
      // label from either.
      paneDir: agent.cwd ? path.basename(agent.cwd) : '',
      foregroundDir: agent.foreground_cwd ? path.basename(agent.foreground_cwd) : '',
      agent: agent.agent || '',
      n: ws.number == null ? '' : String(ws.number),
    };
  }

  #plan(kind, id, current, desired, vars, agent, force = false) {
    if (!id || !desired) return null;
    const verdict = decide({
      kind, id, current, desired,
      intent: vars.intent,
      cfg: this.cfg,
      store: this.store,
      agentStatus: agent.agent_status,
      context: {
        project: vars.project,
        repo: vars.repo,
        dirName: vars.dirName,
        paneDir: vars.paneDir,
        foregroundDir: vars.foregroundDir,
        branch: vars.branch,
      },
      force,
    });
    return { kind, id, current, desired, verdict, agent: agent.pane_id, vars };
  }

  /* Display-only metadata for the sidebar.

     Published to both surfaces, because herdr resolves them from different
     places: a Space row's $name comes from workspace metadata, an Agent row's
     $name comes from PANE metadata. Publishing only one leaves the other
     panel's row empty, and herdr hides a row whose tokens are all empty.

     Sent on every sync regardless of renaming: a project does not go stale
     just because the title did. */
  async publishMetadata(snapshot) {
    if (!this.cfg.metadata?.enabled) return 0;
    const idx = index(snapshot);
    this.panes = idx.panes;
    const sink = this.sinks.find((x) => x.name === 'herdr' && x.reportMetadata);
    if (!sink) return 0;
    let published = 0;

    const send = async (kind, id, tokens) => {
      const key = kind + ':' + id;
      const next = JSON.stringify(tokens);
      if (this.store.metadata(key) === next) return;
      try {
        await sink.reportMetadata(kind, id, tokens);
        this.store.setMetadata(key, next);
        published += 1;
      } catch (err) {
        this.log('warn', 'metadata for ' + key + ': ' + err.message);
      }
    };

    const now = Date.now();
    const duration = (a) => {
      if (!this.cfg.showDuration) return null;
      const { at } = this.store.stateAt(a.pane_id, a.agent_status || 'unknown', now);
      return formatSince(now - at);
    };

    /* One lookup, two answers. titleSeen records when the title last changed
       and how many state transitions it has survived since. */
    const title = (a) => this.store.titleSeen(
      a.pane_id, normalize(a.terminal_title_stripped || ''), a.state_change_seq || 0, now,
    );

    /* A title the agent has stopped maintaining. Reported, never acted on:
       there is nothing better to rename to, and guessing would be worse than
       showing a name that is merely old. */
    const stale = (a) => {
      if (!this.cfg.showStale) return null;
      return title(a).turns >= this.cfg.staleAfterTurns ? 'stale' : null;
    };

    /* How long this intent has been the current one. Different question from
       $since, which resets on every state transition: an agent that has
       started and finished work six times is still describing the same task,
       and this is the number that says so. */
    const age = (a) => {
      if (!this.cfg.showDuration) return null;
      return formatSince(now - title(a).at);
    };

    for (const [workspaceId, agentsHere] of idx.byWorkspace) {
      const ws = idx.workspaces.get(workspaceId);
      if (!ws) continue;
      if (this.cfg.respectPluginRoles && isClaimed(ws)) continue;

      // Every agent gets pane tokens, so the Agents panel row is populated
      // even when a workspace holds several.
      for (const a of agentsHere) {
        const v = await this.#vars(a, ws);
        if (!v) continue;
        await send('pane', a.pane_id, {
          // $n is the workspace's own number, which herdr has no built-in
          // token for. It is what prefix+shift+N jumps to, so showing it
          // turns the sidebar from a list into something navigable.
          n: v.n || null,
          // The one state that changes namesync's behaviour completely, and
          // the one it used not to show at all.
          locked: this.store.isLocked(workspaceId) ? 'held' : null,
          stale: stale(a),
          project: v.project || null,
          worktree: v.worktree || null,
          branch: v.branch || null,
          since: duration(a),
          age: age(a),
          agent: v.agent || null,
        });
      }

      const lead = agentsHere.length === 1
        ? agentsHere[0]
        : agentsHere.find((a) => a.focused) || agentsHere[0];
      if (!lead) continue;
      const v = await this.#vars(lead, ws);
      if (!v) continue;

      await send('workspace', workspaceId, {
        n: v.n || null,
        locked: this.store.isLocked(workspaceId) ? 'held' : null,
        stale: stale(lead),
        project: v.project || null,
        worktree: v.worktree || null,
        branch: v.branch || null,
        intent: v.intent || null,
        since: duration(lead),
        age: age(lead),
        agent: v.agent || null,
        agents: agentsHere.length > 1 ? String(agentsHere.length) : null,
      });
    }

    // stateAt may have advanced even when nothing was republished.
    this.store.save();
    return published;
  }

  // Applies the plans that passed the policy, recording authorship so a later
  // hand edit is recognisable.
  async apply(plans) {
    const applied = [];
    // A pass that only locks still mutated the store. Saving on `applied`
    // alone silently dropped exactly the case the plugin exists to protect:
    // a human renamed something and we backed off.
    let dirty = false;

    for (const plan of plans) {
      if (plan.verdict.shouldLock) {
        this.store.lock(plan.id, 'edited by hand', plan.current);
        dirty = true;
        this.log('lock', plan.kind + ' ' + plan.id + ' -> keeping "' + plan.current + '"');
        continue;
      }
      // A cleared name released its hold; record that before renaming so the
      // workspace is managed again from here on.
      if (plan.verdict.shouldRelease) {
        this.store.unlock(plan.id);
        dirty = true;
        this.log('info', 'released ' + plan.kind + ' ' + plan.id + ' (name was cleared)');
      }

      if (!plan.verdict.rename) continue;

      let ok = false;
      for (const sink of this.sinks) {
        // A sink that ignores `kind` and returns true regardless would have us
        // record authorship for a rename it never performed — after which the
        // target looks hand-edited and gets locked forever.
        if (Array.isArray(sink.kinds) && !sink.kinds.includes(plan.kind)) continue;
        try {
          if (await sink.apply({ kind: plan.kind, id: plan.id, label: plan.desired })) ok = true;
        } catch (err) {
          this.log('warn', sink.name + ' could not rename ' + plan.kind + ' ' + plan.id + ': ' + err.message);
        }
      }
      if (!ok) continue;

      this.store.setAuthored(plan.kind, plan.id, plan.desired).markRenamed(plan.id);
      dirty = true;
      applied.push(plan);
      this.log('rename', plan.kind + ' ' + plan.id + ': "' + plan.current + '" -> "' + plan.desired + '"');
    }
    if (dirty) this.store.save();
    return applied;
  }
}

module.exports = { Namer, index, leadAgent, gitBranch, detectProject,
  findProjectRoot, repoNameFromUrl, manifestName, remoteName, isUselessCwd,
  gitInfo, gitCache };
