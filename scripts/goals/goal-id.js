#!/usr/bin/env node
/**
 * Goal ID grammar + registry allocation.
 * Contract: docs/06-workflows/goal-id.md
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GOAL_ID_RE = /^(G-[A-Z]{2,8}-[0-9]{3}|G-[0-9]{3})$/i;
const EPIC_SLUG_RE = /^[A-Z]{2,8}$/;
const GOAL_FILENAME_RE = /^(G-[A-Z]{2,8}-[0-9]{3}|G-[0-9]{3})\.md$/i;
const IMPLICIT_EPIC = 'CORE';
const REGISTRY_REL = 'docs/07-backlog/goal-id-registry.yaml';
const EPICS_INDEX_REL = 'docs/07-backlog/epics.md';

function normalizeGoalId(id) {
  return String(id || '').toUpperCase();
}

function isGoalId(id) {
  return GOAL_ID_RE.test(normalizeGoalId(id));
}

function parseGoalId(id) {
  const n = normalizeGoalId(id);
  if (!GOAL_ID_RE.test(n)) return null;
  const namespaced = n.match(/^G-([A-Z]{2,8})-([0-9]{3})$/);
  if (namespaced) {
    return { id: n, epic: namespaced[1], seq: parseInt(namespaced[2], 10), legacy: false };
  }
  const legacy = n.match(/^G-([0-9]{3})$/);
  return { id: n, epic: IMPLICIT_EPIC, seq: parseInt(legacy[1], 10), legacy: true };
}

function formatGoalId(epic, seq) {
  const slug = String(epic || IMPLICIT_EPIC).toUpperCase();
  const n = Number(seq);
  if (!EPIC_SLUG_RE.test(slug)) {
    throw new Error(`Invalid epic slug "${epic}" — use 2–8 letters A-Z`);
  }
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new Error(`Invalid sequence ${seq} — use 1–999`);
  }
  return `G-${slug}-${String(n).padStart(3, '0')}`;
}

const EPIC_BRANCH_RE = /^epic\/([A-Za-z]{2,8})$/;

function currentGitBranch(cwd) {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: cwd || process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const name = (result.stdout || '').trim();
  return name && name !== 'HEAD' ? name : null;
}

/** Branch `epic/PAY` or `epic/pay` → `PAY`. Other names → null. */
function detectEpicFromGitBranch(cwd) {
  const branch = currentGitBranch(cwd);
  if (!branch) return null;
  const match = branch.match(EPIC_BRANCH_RE);
  return match ? match[1].toUpperCase() : null;
}

function resolveEpic(explicitEpic, cwd) {
  const fromArg = explicitEpic ? String(explicitEpic).toUpperCase() : '';
  const fromBranch = detectEpicFromGitBranch(cwd);
  if (fromArg && fromBranch && fromArg !== fromBranch) {
    throw new Error(
      `Epic mismatch: argument ${fromArg} vs branch epic/${fromBranch}. ` +
        `Use soda-os goal next (no slug) on this branch, or check out the matching branch.`
    );
  }
  const slug = fromArg || fromBranch;
  if (!slug) {
    throw new Error(
      'No epic given. Pass PAY or run from branch epic/PAY (then `soda-os goal next` is enough).'
    );
  }
  return slug;
}

function findProjectRoot(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const markers = ['docs/07-backlog/goals', 'AGENTS.md'];
  for (let i = 0; i < 8; i++) {
    if (markers.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not find Soda project root. Run from a soda-os project.');
}

function goalDirs(root) {
  return [
    path.join(root, 'docs/07-backlog/goals'),
    path.join(root, 'docs/07-backlog/goals/_archived'),
  ];
}

function listGoalFiles(root) {
  const found = [];
  for (const dir of goalDirs(root)) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith('_') || name === 'README.md' || !name.endsWith('.md')) continue;
      const parsedName = name.match(GOAL_FILENAME_RE);
      if (!parsedName) {
        found.push({
          id: null,
          epic: null,
          seq: null,
          legacy: null,
          filename: name,
          path: path.join(dir, name),
          invalidFilename: true,
        });
        continue;
      }
      const parsed = parseGoalId(parsedName[1]);
      found.push({
        ...parsed,
        filename: name,
        path: path.join(dir, name),
        invalidFilename: false,
      });
    }
  }
  return found;
}

function registryPath(root) {
  return path.join(root, REGISTRY_REL);
}

function emptyRegistry() {
  return {
    schema_version: '1',
    epics: {
      [IMPLICIT_EPIC]: { name: 'Core / unscoped', next_seq: 1, reserved: [] },
    },
  };
}

function parseReserved(raw) {
  const inner = String(raw || '').replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function loadRegistry(root) {
  const file = registryPath(root);
  if (!fs.existsSync(file)) return emptyRegistry();

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const registry = { schema_version: '1', epics: {} };
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const version = trimmed.match(/^schema_version:\s*["']?([^"']+)["']?/);
    if (version) {
      registry.schema_version = version[1];
      continue;
    }
    if (trimmed === 'epics:') {
      current = null;
      continue;
    }

    const indent = line.length - line.trimStart().length;
    if (indent === 2 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      current = trimmed.slice(0, -1).toUpperCase();
      registry.epics[current] = { name: current, next_seq: 1, reserved: [] };
      continue;
    }
    if (!current) continue;

    const name = trimmed.match(/^name:\s*(.+)$/);
    if (name) {
      registry.epics[current].name = name[1].replace(/^["']|["']$/g, '');
      continue;
    }
    const nextSeq = trimmed.match(/^next_seq:\s*(\d+)/);
    if (nextSeq) {
      registry.epics[current].next_seq = parseInt(nextSeq[1], 10);
      continue;
    }
    const reserved = trimmed.match(/^reserved:\s*(.+)$/);
    if (reserved) {
      registry.epics[current].reserved = parseReserved(reserved[1]);
    }
  }

  if (!registry.epics[IMPLICIT_EPIC]) {
    registry.epics[IMPLICIT_EPIC] = { name: 'Core / unscoped', next_seq: 1, reserved: [] };
  }
  return registry;
}

function yamlScalar(value) {
  const text = String(value);
  if (/[:#]|^\s|\s$/.test(text)) return JSON.stringify(text);
  return text;
}

function serializeRegistry(registry) {
  const lines = [
    '# Goal ID reservation registry — product-owned.',
    '# Allocate with: soda-os goal next <EPIC>',
    '# Filename = ID exactly. Title lives in the H1 after the colon.',
    '# Contract: docs/06-workflows/goal-id.md',
    `schema_version: "${registry.schema_version || '1'}"`,
    'epics:',
  ];
  const slugs = Object.keys(registry.epics).sort((a, b) => {
    if (a === IMPLICIT_EPIC) return -1;
    if (b === IMPLICIT_EPIC) return 1;
    return a.localeCompare(b);
  });
  for (const slug of slugs) {
    const epic = registry.epics[slug];
    const reserved = (epic.reserved || []).slice().sort((x, y) => x - y);
    lines.push(`  ${slug}:`);
    lines.push(`    name: ${yamlScalar(epic.name || slug)}`);
    lines.push(`    next_seq: ${epic.next_seq || 1}`);
    lines.push(`    reserved: [${reserved.join(', ')}]`);
  }
  return `${lines.join('\n')}\n`;
}

function saveRegistry(root, registry, dryRun) {
  const file = registryPath(root);
  const body = serializeRegistry(registry);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, 'utf8');
  }
  return file;
}

function epicRegistered(registry, epic) {
  return Boolean(registry.epics[String(epic).toUpperCase()]);
}

function usedSequences(root, epic, registry) {
  const slug = String(epic).toUpperCase();
  const used = new Set();
  for (const file of listGoalFiles(root)) {
    if (!file.invalidFilename && file.epic === slug) used.add(file.seq);
  }
  const row = registry.epics[slug];
  if (row) {
    for (const n of row.reserved || []) used.add(n);
    const impliedEnd = Math.max(1, row.next_seq || 1) - 1;
    for (let i = 1; i <= impliedEnd; i++) used.add(i);
  }
  return used;
}

function nextAvailableSeq(used) {
  let n = 1;
  while (used.has(n)) n += 1;
  if (n > 999) throw new Error('Sequence exhausted (001–999) for this epic');
  return n;
}

function requireEpic(root, epic, { allowCreateCore = true } = {}) {
  const slug = String(epic || '').toUpperCase();
  if (!EPIC_SLUG_RE.test(slug)) {
    throw new Error(`Invalid epic slug "${epic}" — use 2–8 letters A-Z (not E-xxx; that is Evidence)`);
  }
  const registry = loadRegistry(root);
  if (!epicRegistered(registry, slug)) {
    if (slug === IMPLICIT_EPIC && allowCreateCore) {
      registry.epics[IMPLICIT_EPIC] = { name: 'Core / unscoped', next_seq: 1, reserved: [] };
      return { slug, registry };
    }
    throw new Error(
      `Epic ${slug} is not registered.\n` +
        `Add it to ${EPICS_INDEX_REL} and ${REGISTRY_REL} first.`
    );
  }
  return { slug, registry };
}

function allocateIds(root, epic, count, { reserve = false, dryRun = false } = {}) {
  const { slug, registry } = requireEpic(root, epic);
  const used = usedSequences(root, slug, registry);
  const allocated = [];
  for (let i = 0; i < count; i++) {
    const seq = nextAvailableSeq(used);
    used.add(seq);
    allocated.push({ seq, id: formatGoalId(slug, seq) });
  }
  const row = registry.epics[slug];
  const maxSeq = allocated[allocated.length - 1].seq;
  row.next_seq = Math.max(row.next_seq || 1, maxSeq + 1);
  if (reserve) {
    const reserved = new Set(row.reserved || []);
    for (const item of allocated) reserved.add(item.seq);
    row.reserved = [...reserved].sort((a, b) => a - b);
  }
  const file = saveRegistry(root, registry, dryRun);
  return { epic: slug, allocated, registryPath: file, dryRun: Boolean(dryRun) };
}

function nextGoal(root, epic, options = {}) {
  return allocateIds(root, epic, 1, { reserve: false, dryRun: options.dryRun });
}

function reserveGoals(root, epic, count, options = {}) {
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('--count must be an integer >= 1');
  }
  return allocateIds(root, epic, n, { reserve: true, dryRun: options.dryRun });
}

module.exports = {
  GOAL_ID_RE,
  EPIC_SLUG_RE,
  GOAL_FILENAME_RE,
  IMPLICIT_EPIC,
  REGISTRY_REL,
  normalizeGoalId,
  isGoalId,
  parseGoalId,
  formatGoalId,
  findProjectRoot,
  listGoalFiles,
  loadRegistry,
  saveRegistry,
  nextGoal,
  reserveGoals,
  currentGitBranch,
  detectEpicFromGitBranch,
  resolveEpic,
};

if (require.main === module) {
  const [cmd, epic, maybeCount] = process.argv.slice(2);
  try {
    const root = findProjectRoot(process.cwd());
    if (cmd === 'next') {
      const result = nextGoal(root, epic);
      console.log(result.allocated[0].id);
    } else if (cmd === 'reserve') {
      const result = reserveGoals(root, epic, parseInt(maybeCount || '1', 10));
      for (const item of result.allocated) console.log(item.id);
    } else {
      console.log('Usage: node goal-id.js next <EPIC> | reserve <EPIC> <count>');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
