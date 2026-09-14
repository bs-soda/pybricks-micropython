import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const pathsDir = resolve(process.cwd(), '.agents/skills/tts-openapi-guide/references/oas/paths');
const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');

// Read all existing goals and their declared endpoints
const existingGoalFiles = readdirSync(goalsDir).filter(f => f.startsWith('G-INFRA-') && f.endsWith('.md'));
const coveredEndpoints = new Set();
let highestId = 0;

for (const file of existingGoalFiles) {
  const m = file.match(/G-INFRA-(\d+)\.md/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > highestId) highestId = num;
  }
  const content = readFileSync(join(goalsDir, file), 'utf8');
  const matches = content.matchAll(/\/([a-zA-Z0-9_{}\/-]+)/g);
  for (const match of matches) {
    coveredEndpoints.add('/' + match[1]);
  }
}

console.log(`Current highest goal ID: G-INFRA-${highestId}`);

// Collect all OpenAPI paths
const allOps = [];
const pathFiles = readdirSync(pathsDir).filter(f => f.endsWith('.json'));

for (const pFile of pathFiles) {
  const data = JSON.parse(readFileSync(join(pathsDir, pFile), 'utf8'));
  const moduleName = pFile.replace('.json', '');
  if (data.paths) {
    for (const p of Object.keys(data.paths)) {
      for (const method of Object.keys(data.paths[p])) {
        allOps.push({
          module: moduleName,
          method: method.toUpperCase(),
          path: p,
          summary: data.paths[p][method].summary || '',
          description: data.paths[p][method].description || ''
        });
      }
    }
  }
}

// Filter unmapped
const unmapped = [];
for (const op of allOps) {
  let isCovered = false;
  for (const ep of coveredEndpoints) {
    if (ep === op.path || (op.path.includes(ep) && ep.length > 15) || (ep.includes(op.path) && op.path.length > 15)) {
      isCovered = true;
      break;
    }
  }
  if (!isCovered) {
    unmapped.push(op);
  }
}

console.log(`Found ${unmapped.length} unmapped endpoints across all 25 modules.`);

// Helper to format title from summary/path
function formatGoalTitle(op) {
  let name = op.summary || '';
  if (!name || name.length < 5) {
    const parts = op.path.split('/').filter(Boolean);
    name = parts.slice(2).join(' ').replace(/[{}]/g, '');
  }
  // Make human readable
  name = name.replace(/([A-Z])/g, ' $1').trim();
  name = name.replace(/^TikTok\s+/i, '');
  name = name.replace(/\s+/g, ' ');
  return `TikTok Shop ${name} Gateway`;
}

// Helper to format files
function formatFiles(op) {
  const mod = op.module.replace(/[^a-zA-Z0-9_]/g, '_');
  return `code/apps/backend/api/src/${mod}_gateway.rs, crates/transport-kit/src/tiktok_${mod}_client.rs`;
}

let nextId = highestId + 1;
const createdGoals = [];

for (const op of unmapped) {
  const goalId = `G-INFRA-${String(nextId).padStart(3, '0')}`;
  const title = formatGoalTitle(op);
  const files = formatFiles(op);
  const desc = op.description.replace(/\n+/g, ' ').slice(0, 180) || `Implements ${op.method} ${op.path} for TikTok Shop integration.`;

  const content = `# ${goalId}: ${title}

**Status:** draft  
**Kind:** api  
**Epic:** INFRA  
**Depends on:** G-INFRA-036  
**Blocks:** —  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Create API client methods in \`${files.split(',')[1].trim()}\` targeting \`${op.path}\` | pending |
| 2 | Expose REST endpoints in \`${files.split(',')[0].trim()}\` | pending |
| 3 | Map domain models and enforce Satang integer / RFC 3339 data invariants | pending |
| 4 | Write integration unit tests verifying payload formatting and error translation | pending |

## Context

Powers enterprise TikTok Shop integration for Sodality Creator Hub. Implements \`${op.method} ${op.path}\`.

## Intent

**Why:** ${desc}

**Done when:** BFF exposes REST endpoints and client communicates with TikTok Shop OpenAPI.

**Unblocks:** Atomic ${op.method} ${op.path} integration pipeline.

## How

> Fill after \`clarify ${goalId}\`.

**Stack / approach:** Rust Axum, \`crates/transport-kit\`, \`crates/domain\`.

## Open questions

- [ ] [NEEDS CLARIFICATION: What rate limit token bucket allocation should be assigned to this endpoint cluster?]

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-TIKTOK-OPENAPI-INTEGRATION |
| **Decisions** | ADR-0004, DOC-RAW-20260902-COMPLETE-OPENAPI-BLUEPRINT |
| **Assumptions required** | A-TIKTOK-SELLER-TOKEN-ACTIVE |
| **Evidence** | E-TIKTOK-OPENAPI-DOCV2-SPEC |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | ADR-0004 |
| **Acceptance** | \`docs/02-product/acceptance/${goalId}.md\` |
| **Skills** | \`soda-rest-api\`, \`tts-openapi-guide\` |
| **Profile** | \`backend-api\` |
| **Task type** | \`add_api\` |
| **Files** | \`${files}\` |
| **Constraints** | Zero Mocks, Zero Stubs |

## Work steps

1. Add routes in \`${files.split(',')[0].trim()}\`.
2. Implement client methods in \`${files.split(',')[1].trim()}\`.
3. Add contract tests for endpoint validation.
`;

  writeFileSync(resolve(goalsDir, `${goalId}.md`), content, 'utf8');
  createdGoals.push({ id: goalId, title, path: op.path });
  coveredEndpoints.add(op.path);
  nextId++;
}

console.log(`Successfully created ${createdGoals.length} atomic goals! Highest ID now: G-INFRA-${nextId - 1}`);
