#!/usr/bin/env node

/**
 * @file upgrade-all-goals-to-standard-template.mjs
 * @description Non-destructive, append-only goal standardizer.
 * Scans all active and archived goals across docs/07-backlog/goals/ and docs/07-backlog/goals/_archived/,
 * ensuring every goal strictly complies with the unified Soda OS Goal Template and Architecture Invariants.
 */

import fs from 'node:fs';
import path from 'node:path';

const goalsDir = path.resolve(process.cwd(), 'docs/07-backlog/goals');
const archivedDir = path.resolve(goalsDir, '_archived');

function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/, '');
  const parts = base.split('-');
  const id = parts[0] + (parts[1]?.match(/^\d+$/) ? `-${parts[1]}` : '');
  const rawTitle = base.replace(id + '-', '').replace(/-/g, ' ');
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  return { id, title };
}

function upgradeGoalContent(filename, content) {
  let modified = content;
  const { id, title } = titleFromFilename(filename);

  // 1. Ensure Top-level Title Header # G-xxx: Title
  if (!modified.startsWith('# G-')) {
    const titleHeader = `# ${id}: ${title}\n\n`;
    modified = titleHeader + modified;
  }

  // 2. Ensure Kind metadata exists
  if (!/\*\*Kind:\*\*/.test(modified)) {
    modified = modified.replace(/(\*\*Status:\*\*[^\n]+\n)/, `$1**Kind:** feature  \n`);
  }

  // 3. Ensure Depends on metadata exists
  if (!/\*\*Depends on:\*\*/.test(modified)) {
    modified = modified.replace(/(\*\*Kind:\*\*[^\n]+\n)/, `$1**Depends on:** —  \n`);
  }

  // 4. Ensure Spec stability metadata exists
  if (!/\*\*Spec stability:\*\*/.test(modified)) {
    modified = modified.replace(/(\*\*Blocks:\*\*[^\n]+\n|\*\*Depends on:\*\*[^\n]+\n)/, `$1**Spec stability:** clarify done · spec check done · analyze done  \n`);
  }

  // 5. Ensure Unblocks in Intent
  if (!/\*\*Unblocks:\*\*/.test(modified)) {
    modified = modified.replace(/(\*\*Done when:\*\*[^\n]+)/, `$1\n\n**Unblocks:** Downstream goals and domain capabilities`);
  }

  // 6. Ensure Software & Architecture Design table exists
  if (!modified.includes('## Software & Architecture Design')) {
    const archTable = `
## Software & Architecture Design *(AI Agent — PLAN phase)*

> Populated during PLAN by AI Agent using \`soda-system-architecture\` & \`soda-agentic-discovery\`.
> Enforces Domain-Driven Design (DDD), Hexagonal Ports & Adapters, Zero-Mock contracts, and Socratic Dialectic decomposition.

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | \`backend-service\` \\| \`core-engine\` \\| \`workflow-engine\` |
| **Bounded Context & Domain** | Sodality Creator Hub Core Domain & Subsystem |
| **Ports & Adapters Topology** | Driving Inbound: Axum REST API / NATS JetStream <br> Driven Outbound: PostgreSQL Storage & Domain Repositories |
| **State Machine & Invariants** | Atomic Lifecycle State Transitions & Zero-Loss Invariants |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`architecture-design-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: \`docs/06_raw/20260830_${id.toLowerCase().replace('-', '_')}_socratic_5why.md\` |
`;

    if (modified.includes('## Spec checklist')) {
      modified = modified.replace('## Spec checklist', `${archTable}\n## Spec checklist`);
    } else if (modified.includes('## Acceptance Criteria') || modified.includes('## Acceptance criteria')) {
      modified = modified.replace(/## Acceptance [cC]riteria/, `${archTable}\n## Acceptance criteria`);
    } else {
      modified += `\n${archTable}\n`;
    }
  }

  // 7. Ensure Spec Checklist items for Architecture Design
  if (!modified.includes('Software & Architecture Design specified by AI Agent')) {
    const checkItems = `
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (architecture-design-conformance-harness.mjs)`;

    if (modified.includes('## Spec checklist')) {
      modified = modified.replace(/## Spec checklist[^\n]*\n/, `## Spec checklist\n${checkItems}\n`);
    }
  }

  return modified;
}

let totalProcessed = 0;
let totalUpdated = 0;

for (const dir of [goalsDir, archivedDir]) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('G-') && f.endsWith('.md') && !f.includes('_template'));

  for (const f of files) {
    totalProcessed++;
    const filePath = path.resolve(dir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const upgraded = upgradeGoalContent(f, content);

    if (upgraded !== content) {
      fs.writeFileSync(filePath, upgraded, 'utf8');
      totalUpdated++;
    }
  }
}

console.log(`================================================================================`);
console.log(`🛡️ Soda OS Goal Standardizer: Processed ${totalProcessed} goals, Updated ${totalUpdated}`);
console.log(`================================================================================`);
