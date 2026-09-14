#!/usr/bin/env node
/**
 * Push one Soda goal (G-PAY-001 or legacy G-001) to ClickUp — create or update task + status.
 *
 * Setup: scripts/clickup.config.json + CLICKUP_API_TOKEN
 *
 * Usage:
 *   soda-os sync-clickup G-PAY-001
  soda-os sync-clickup G-029
 *   soda-os sync-clickup G-029 --status-only
 *   soda-os sync-clickup --all
 *   soda-os sync-clickup --all --status-only
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.clickup.com/api/v2';
const GOAL_ID_RE = /^G-(?:[A-Z]{2,8}-)?\d{3}$/i;

function repoRoot() {
  let dir = process.cwd();
  const markers = ['docs/07-backlog/goals', 'AGENTS.md'];
  for (let i = 0; i < 6; i++) {
    if (markers.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not find Soda project root. Run from repo root.');
}

function loadConfig(root, options = {}) {
  const localPath = path.join(root, 'scripts/clickup.config.json');
  const examplePath = path.join(root, 'scripts/clickup.config.example.json');
  if (fs.existsSync(localPath)) return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  if (options.ifConfigured) {
    return null;
  }
  if (fs.existsSync(examplePath)) {
    console.error('Error: scripts/clickup.config.json not found.');
    console.error('  cp scripts/clickup.config.example.json scripts/clickup.config.json');
    process.exit(1);
  }
  throw new Error('No ClickUp config found.');
}

function findGoalFile(root, goalId) {
  const id = goalId.toUpperCase();
  const exact = `${id}.md`;
  for (const dir of [
    path.join(root, 'docs/07-backlog/goals'),
    path.join(root, 'docs/07-backlog/goals/_archived'),
  ]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
    // Prefer filename = ID (framework 1.23.0); fall back to legacy slug G-001-*.md
    const match = files.find((f) => f === exact) || files.find((f) => f.startsWith(`${id}-`));
    if (match) return path.join(dir, match);
  }
  return null;
}

function extractStatus(content) {
  return content.match(/\*\*Status:\*\*\s*(\S+)/)?.[1]?.replace(/\*+$/, '') ?? 'draft';
}

function listGoals(root) {
  const dir = path.join(root, 'docs/07-backlog/goals');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^(G-[A-Z]{2,8}-\d{3}|G-\d{3})(-.+)?\.md$/i.test(f) && !f.startsWith('_'))
    .sort()
    .map((f) => {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const fallbackId = (f.match(/^(G-[A-Z]{2,8}-\d{3}|G-\d{3})/i) || [])[1];
      const parsed = parseGoal(content, fallbackId);
      return {
        id: parsed.id,
        status: parsed.status,
        title: parsed.title,
      };
    });
}

function parseGoal(content, fallbackId) {
  // Extract first line or first H1 heading (# ...)
  const lines = content.split('\n');
  const firstH1Line = lines.find((l) => l.trim().startsWith('#')) || lines[0] || '';
  
  // Strip leading '# ' or '#'
  const cleanLine = firstH1Line.replace(/^#+\s*/, '').trim();
  
  let id = fallbackId ? fallbackId.toUpperCase() : 'UNKNOWN';
  let title = cleanLine || 'Untitled';

  // Check if cleanLine has format "G-XXX: Title" or "G-XXX - Title"
  const colonMatch = cleanLine.match(/^(G-(?:[A-Z]{2,8}-)?\d{3}|G-\d{3}|[A-Za-z0-9_-]+):\s*(.+)$/i);
  if (colonMatch) {
    id = colonMatch[1].toUpperCase();
    title = colonMatch[2].trim();
  } else {
    const dashMatch = cleanLine.match(/^(G-(?:[A-Z]{2,8}-)?\d{3}|G-\d{3}|[A-Za-z0-9_-]+)\s*[-–—]\s*(.+)$/i);
    if (dashMatch) {
      id = dashMatch[1].toUpperCase();
      title = dashMatch[2].trim();
    }
  }

  return {
    id: id || fallbackId?.toUpperCase() || 'UNKNOWN',
    title: title || 'Untitled',
    status: extractStatus(content),
    bodyFromContext: extractFromContext(content),
  };
}

function buildTaskName(id, title, repo) {
  const core = `${id}: ${title}`;
  if (repo && !repo.includes('{{') && !repo.includes('PASTE')) return `[${repo}] ${core}`;
  return core;
}

function extractFromContext(content) {
  const idx = content.search(/^## Context\s*$/m);
  return idx === -1 ? null : content.slice(idx).trim();
}

function buildDescription(body, repo) {
  if (!body) {
    return repo ? `**Repo:** ${repo}\n\n_(No ## Context section.)_` : '_(No ## Context section.)_';
  }
  return (repo ? `**Repo:** ${repo}\n\n---\n\n` : '') + body;
}

async function clickupRequest(token, method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`ClickUp API ${res.status}: ${data.err || data.ECODE || res.statusText}`);
  return data;
}

async function fetchListStatuses(token, listId) {
  const data = await clickupRequest(token, 'GET', `/list/${listId}`);
  return (data.statuses ?? []).map((s) => s.status);
}

async function findExistingTask(token, listId, goalId, repo) {
  const goalPart = `${goalId.toUpperCase()}:`;
  const prefixed = repo && !repo.includes('{{') && !repo.includes('PASTE')
    ? `[${repo}] ${goalPart}`.toUpperCase()
    : null;
  let page = 0;
  while (true) {
    const data = await clickupRequest(token, 'GET', `/list/${listId}/task?page=${page}&include_closed=true`);
    const hit = (data.tasks ?? []).find((t) => {
      const name = t.name.toUpperCase();
      if (prefixed && name.startsWith(prefixed)) return true;
      return name.startsWith(goalPart) || name.includes(`] ${goalPart}`);
    });
    if (hit) return hit;
    if ((data.tasks ?? []).length < 100) break;
    page += 1;
  }
  return null;
}

function mapStatus(sodaStatus, statusMap) {
  if (!statusMap) return null;
  return statusMap[sodaStatus] ?? statusMap[sodaStatus.toLowerCase()] ?? null;
}

/** Resolve statusMap value to exact ClickUp List status string. */
function resolveClickUpStatus(sodaStatus, statusMap, listStatuses) {
  const mapped = mapStatus(sodaStatus, statusMap);
  if (!mapped) return { status: null, warning: `no statusMap for "${sodaStatus}"` };
  if (!listStatuses?.length) return { status: mapped, warning: null };

  const exact = listStatuses.find((s) => s === mapped);
  if (exact) return { status: exact, warning: null };

  const fuzzy = listStatuses.find((s) => s.toLowerCase() === mapped.toLowerCase());
  if (fuzzy) return { status: fuzzy, warning: null };

  return {
    status: null,
    warning: `"${mapped}" not in List. Available: ${listStatuses.join(', ')}`,
  };
}

function buildTaskPayload(goal, config, listStatuses) {
  const { status: clickupStatus, warning } = resolveClickUpStatus(goal.status, config.statusMap, listStatuses);
  const description = buildDescription(goal.bodyFromContext, config.repo);
  const payload = {
    name: buildTaskName(goal.id, goal.title, config.repo),
    description,
    markdown_description: description,
  };
  if (clickupStatus) payload.status = clickupStatus;
  return { payload, clickupStatus, statusWarning: warning };
}

async function syncGoal(goalId, options, shared = {}) {
  const root = shared.root ?? repoRoot();
  const config = shared.config ?? loadConfig(root, options);
  const token = shared.token ?? process.env.CLICKUP_API_TOKEN ?? process.env.CLICKUP_API_KEY;

  if (!config && options.ifConfigured) {
    console.log('ClickUp config not found; skipping sync (--if-configured).');
    return;
  }
  if (!token && options.ifConfigured) {
    console.log('CLICKUP_API_TOKEN / CLICKUP_API_KEY not set; skipping sync (--if-configured).');
    return;
  }

  if (!token && !options.dryRun) {
    console.error('Error: CLICKUP_API_TOKEN or CLICKUP_API_KEY is not set.');
    process.exit(1);
  }
  if (!options.dryRun && (!config.listId || config.listId.includes('PASTE'))) {
    console.error('Error: Set listId in scripts/clickup.config.json');
    process.exit(1);
  }

  const goalPath = findGoalFile(root, goalId);
  if (!goalPath) {
    console.error(`Error: Goal not found: ${goalId.toUpperCase()}`);
    process.exit(1);
  }

  const goal = parseGoal(fs.readFileSync(goalPath, 'utf8'), goalId);
  let listStatuses = shared.listStatuses;
  if (!listStatuses && token && !options.dryRun) {
    listStatuses = await fetchListStatuses(token, config.listId);
  }

  const { payload, clickupStatus, statusWarning } = buildTaskPayload(goal, config, listStatuses);

  console.log(`Task:   ${payload.name}`);
  console.log(`Status: ${goal.status}${clickupStatus ? ` → "${clickupStatus}"` : ' (not updated)'}`);
  if (statusWarning) console.log(`Warn:   ${statusWarning}`);

  if (options.dryRun) {
    console.log('\n--dry-run:\n', JSON.stringify({ listId: config.listId, ...payload }, null, 2));
    return;
  }

  const existing = await findExistingTask(token, config.listId, goal.id, config.repo);
  const previousStatus = existing?.status?.status ?? null;

  if (existing) {
    const updateBody = options.statusOnly
      ? {}
      : { name: payload.name, description: payload.description, markdown_description: payload.markdown_description };
    if (clickupStatus) updateBody.status = clickupStatus;

    if (!Object.keys(updateBody).length) {
      console.log('\n⚠️  Nothing to update.');
      return;
    }

    await clickupRequest(token, 'PUT', `/task/${existing.id}`, updateBody);
    const note = clickupStatus && previousStatus !== clickupStatus
      ? `status "${previousStatus}" → "${clickupStatus}"`
      : clickupStatus ? `status "${clickupStatus}"` : 'content';
    console.log(`\n✅ Updated (${note}): ${existing.url || existing.id}`);
  } else {
    const created = await clickupRequest(token, 'POST', `/list/${config.listId}/task`, payload);
    console.log(`\n✅ Created (status: "${clickupStatus ?? 'default'}"): ${created.url || created.id}`);
  }
}

async function syncAllGoals(options) {
  const root = repoRoot();
  const config = loadConfig(root, options);
  const token = process.env.CLICKUP_API_TOKEN ?? process.env.CLICKUP_API_KEY;

  if (!config && options.ifConfigured) {
    console.log('ClickUp config not found; skipping sync (--if-configured).');
    return;
  }
  if (!token && options.ifConfigured) {
    console.log('CLICKUP_API_TOKEN / CLICKUP_API_KEY not set; skipping sync (--if-configured).');
    return;
  }

  const goals = listGoals(root);
  if (!goals.length) return console.log('No active goals.');

  let listStatuses = null;
  if (token && !options.dryRun) {
    listStatuses = await fetchListStatuses(token, config.listId);
    console.log(`ClickUp statuses: ${listStatuses.join(' | ')}\n`);
  }

  const shared = { root, config, token, listStatuses };
  for (const g of goals) {
    console.log('---');
    await syncGoal(g.id, options, shared);
  }
  console.log(`\nDone: ${goals.length} goal(s).`);
}

function printUsage() {
  console.log(`Usage:
  soda-os sync-clickup G-029                 Create or update (body + status)
  soda-os sync-clickup G-029 --status-only   Update status only
  soda-os sync-clickup --all                 Sync all active goals
  soda-os sync-clickup --all --status-only   Refresh all statuses
  soda-os sync-clickup --if-configured       Skip gracefully if ClickUp is not configured
  soda-os sync-clickup --list`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    statusOnly: args.includes('--status-only'),
    ifConfigured: args.includes('--if-configured'),
  };

  if (args.includes('--help') || args.includes('-h')) return printUsage();

  if (args.includes('--list')) {
    for (const g of listGoals(repoRoot())) console.log(`  ${g.id}  [${g.status}]  ${g.title}`);
    return;
  }

  if (args.includes('--all')) return syncAllGoals(options);

  const goalId = args.filter((a) => !a.startsWith('--'))[0];
  if (!goalId || !GOAL_ID_RE.test(goalId)) {
    printUsage();
    process.exit(1);
  }
  await syncGoal(goalId, options);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  parseGoal,
  buildTaskName,
  listGoals,
  findGoalFile,
  extractStatus,
  extractFromContext,
  buildDescription,
  resolveClickUpStatus,
  syncGoal,
  syncAllGoals,
};
