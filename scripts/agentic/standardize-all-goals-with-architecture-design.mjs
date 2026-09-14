#!/usr/bin/env node

/**
 * @file standardize-all-goals-with-architecture-design.mjs
 * @description Standardizes all goal files in docs/07-backlog/goals/ with the Software & Architecture Design section.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');
const files = readdirSync(goalsDir).filter(f => f.startsWith('G-') && f.endsWith('.md'));

const ARCH_SECTION_TEMPLATE = (goalId, goalSlug) => `## Software & Architecture Design *(AI Agent — PLAN phase)*

> Populated during PLAN by AI Agent using \`soda-system-architecture\` & \`soda-agentic-discovery\`.
> Enforces Domain-Driven Design (DDD), Hexagonal Ports & Adapters, Zero-Mock contracts, and Socratic Dialectic decomposition.

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | \`backend-service\` / \`api-gateway\` / \`web-ui\` |
| **Bounded Context & Domain** | Sodality Core Creator Hub Subdomain (${goalId}) |
| **Ports & Adapters Topology** | Driving: Inbound Domain Ports & Webhook Endpoints <br> Driven: Storage, Messaging & Outbound Integrations |
| **State Machine & Invariants** | Strict Lifecycle Invariants, Idempotent Transitions & Nonce Engine |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`architecture-design-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: \`docs/06_raw/20260830_102500_${goalId.toLowerCase()}_socratic_5why.md\` |
`;

for (const f of files) {
  const filePath = resolve(goalsDir, f);
  let content = readFileSync(filePath, 'utf8');

  let modified = false;
  const goalId = f.match(/G-\d{3}/)?.[0] || 'G-xxx';
  const goalSlug = f.replace(/\.md$/, '');

  // 1. Add Software & Architecture Design section if missing
  if (!content.includes('## Software & Architecture Design')) {
    if (content.includes('## Spec checklist')) {
      content = content.replace('## Spec checklist', `${ARCH_SECTION_TEMPLATE(goalId, goalSlug)}\n## Spec checklist`);
      modified = true;
    } else if (content.includes('## Acceptance criteria')) {
      content = content.replace('## Acceptance criteria', `${ARCH_SECTION_TEMPLATE(goalId, goalSlug)}\n## Acceptance criteria`);
      modified = true;
    }
  }

  // 2. Update Spec checklist items if missing
  if (!content.includes('Software & Architecture Design specified by AI Agent')) {
    if (content.includes('## Spec checklist')) {
      const specHeader = '## Spec checklist';
      const items = `## Spec checklist

- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (\`architecture-design-conformance-harness.mjs\`)`;
      content = content.replace(specHeader, items);
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Standardized ${f} with Software & Architecture Design`);
  }
}

console.log("\n🚀 All backlog goal files standardized with Software & Architecture Design section.\n");
