#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL TEMPLATE CONFORMANCE & VALIDATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Reference: template/docs/07-backlog/goals/_template.md & sodality-creator-hub
 * Purpose: Automated, deterministic validation harness that verifies every target
 *          goal specification strictly adheres to all 26 canonical sections,
 *          frontmatter metadata, markdown tables, checklist invariants, touch
 *          map paths, and Software & Architecture Design invariants from
 *          docs/07-backlog/goals/_template.md.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename, relative, join } from 'node:path';

export const REQUIRED_SECTIONS = [
  { name: "Title & Header", pattern: /^#\s+G-(?:[A-Za-z0-9_-]+|xxx):\s+.+/im },
  { name: "Status Metadata", pattern: /\*\*Status:\*\*\s+(?:draft|planned|ready|in_progress|review|blocked|approved|done)/i },
  { name: "Kind Metadata", pattern: /\*\*Kind:\*\*\s+(?:feature|design|api|migration|qa|chore)/i },
  { name: "Atomic Outcome Metadata", pattern: /\*\*Atomic outcome:\*\*\s+.+/i },
  { name: "Epic Metadata", pattern: /\*\*Epic:\*\*\s+/i },
  { name: "Depends on Metadata", pattern: /\*\*Depends on:\*\*\s+/i },
  { name: "Blocks Metadata", pattern: /\*\*Blocks:\*\*\s+/i },
  { name: "Spec Stability Metadata", pattern: /\*\*Spec stability:\*\*\s+/i },
  { name: "Plan Phase Table", pattern: /\|\s*DEFINE\s*\|\s*PLAN\s*\|\s*EXECUTE\s*\|\s*REVIEW\s*\|\s*SHIP\s*\|/i },
  { name: "Plan Steps Table", pattern: /\|\s*#\s*\|\s*Step\s*\|\s*Status\s*\|/i },
  { name: "Context Section", pattern: /##\s+Context/i },
  { name: "Intent Section", pattern: /##\s+Intent/i },
  { name: "Intent Why Invariant", pattern: /\*\*Why:\*\*\s+.+/i },
  { name: "Intent Done When Invariant", pattern: /\*\*Done when:\*\*\s+/i },
  { name: "Intent Unblocks Invariant", pattern: /\*\*Unblocks:\*\*\s+/i },
  { name: "Atomicity & Zero-Mock Contract", pattern: /##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]+?-\s+\*\*One outcome:\*\*[\s\S]+?-\s+\*\*Concrete execution:\*\*/i },
  { name: "How Section", pattern: /##\s+How/i },
  { name: "Open Questions Section", pattern: /##\s+Open\s+questions/i },
  { name: "Knowledge Links Table", pattern: /##\s+Knowledge\s+links[\s\S]+?\|\s*Type\s*\|\s*IDs\s*\|/i },
  { name: "Context Manifest Table", pattern: /##\s+Context\s+manifest[\s\S]+?\|\s*Kind\s*\|\s*IDs\s*\/\s*paths\s*\|/i },
  { name: "Structured Atomic Work Steps", pattern: /##\s+Work\s+steps[\s\S]+?###\s+Step\s+\d+[\s\S]+?\*\*Allowed files:\*\*[\s\S]+?\*\*Actions:\*\*[\s\S]+?\*\*Completion gate:\*\*[\s\S]+?\*\*Stop condition:\*\*/i },
  { name: "In Scope Section", pattern: /##\s+In\b[\s\S]*?\n\s*-\s+/i },
  { name: "Out Scope Section", pattern: /##\s+Out\b[\s\S]*?\n\s*-\s+/i },
  { name: "Change Delta Table", pattern: /##\s+Change\s+delta[\s\S]+?\|\s*Area\s*\|\s*Action\s*\|\s*Path\s*\/\s*behaviour\s*\|/i },
  { name: "Software & Architecture Design Section", pattern: /##\s+Software\s+&\s+Architecture\s+Design[\s\S]+?\|\s*Architectural Dimension\s*\|\s*Specification\s*\/\s*Invariant\s*\|/i },
  { name: "Spec Checklist", pattern: /##\s+Spec\s+checklist[\s\S]+?-\s+\[[x ]\]\s+(?:Software\s+&\s+Architecture\s+Design\s+specified|Intent is WHAT\/WHY only)/i },
  { name: "Acceptance Criteria", pattern: /##\s+Acceptance\s+criteria[\s\S]+?-\s+\[[x ]\]\s+.+/i },
  { name: "Test Plan", pattern: /##\s+Test\s+plan[\s\S]+?-\s+.+/i },
  { name: "Touch Map", pattern: /##\s+Touch\s+map[\s\S]+?-\s+.+/i },
  { name: "Notes for AI", pattern: /##\s+Notes\s+for\s+AI/i },
  { name: "Comprehensive Spec Design Appendix", pattern: /##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix|##\s+Software\s+&\s+Architecture\s+Design/i },
  { name: "Finite State Machine (FSM) Matrix", pattern: /Finite\s+State\s+Machine\s+\(FSM\)\s+Matrix|State\s+Machine\s+&\s+Invariants/i },
  { name: "Mathematical & Data Invariants Spec", pattern: /Mathematical\s+&\s+Data\s+Invariants|Zero\s+Float\s+Arithmetic|Satang/i },
  { name: "Hexagonal Ports & Adapters Spec", pattern: /Hexagonal\s+Inbound\s+&\s+Outbound\s+Ports|Ports\s+&\s+Adapters\s+Topology/i }
];


export const INTENT_STACK_ANTI_PATTERNS = [
  /\b(?:using|with)\s+(?:next\.?js|react|vue|angular|express|fastapi|nest\.?js|django|flask|spring|actix|axum|gin)\b/i,
  /\b(?:using|with)\s+(?:postgres(?:ql)?|mysql|sqlite|mongodb|redis|dynamodb|cassandra|prisma|typeorm|diesel)\b/i,
  /\b(?:in|under)\s+(?:src\/|code\/|app\/|pages\/|components\/|api\/|routes\/)\b/i
];

/**
 * Validates a single goal specification file against all 26 canonical invariants.
 */
export function validateGoalConformance(filePath) {
  if (!existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
      warnings: [],
      passedCount: 0,
      totalCount: REQUIRED_SECTIONS.length,
      goalId: 'UNKNOWN',
      filename: basename(filePath),
      filePath
    };
  }

  const content = readFileSync(filePath, 'utf8');
  const filename = basename(filePath);
  const goalIdMatch = filename.match(/G-[A-Za-z0-9_-]+/i) || content.match(/^#\s+(G-(?:[A-Za-z0-9_-]+|xxx)):/im);
  const goalId = goalIdMatch ? (goalIdMatch[1] || goalIdMatch[0]).toUpperCase() : 'G-XXX';

  const errors = [];
  const warnings = [];
  let passedCount = 0;

  for (const rule of REQUIRED_SECTIONS) {
    if (rule.pattern.test(content)) {
      passedCount++;
    } else {
      errors.push(`Missing or invalid required section: "${rule.name}"`);
    }
  }

  // Anti-Solutioneering check in Intent
  if (/##\s+Intent/i.test(content)) {
    const intentBlockMatch = content.match(/##\s+Intent[\s\S]*?(?=\n##\s+How|\n##\s+Open|\n##\s+Context|\n##\s+Work|$)/i);
    const intentBlock = intentBlockMatch ? intentBlockMatch[0] : '';
    for (const pattern of INTENT_STACK_ANTI_PATTERNS) {
      if (pattern.test(intentBlock)) {
        warnings.push(`Intent contains premature stack/path solutioneering matching ${pattern}. Intent must be WHAT/WHY only.`);
      }
    }
  }

  // Open questions Socratic validation
  const statusLineMatch = content.match(/\*\*Status:\*\*\s*([a-zA-Z_]+)/i);
  const singleStatus = statusLineMatch ? statusLineMatch[1].toLowerCase() : '';
  const isStrictActive = ['ready', 'in_progress', 'review', 'approved', 'done'].includes(singleStatus);

  if (/##\s+Open\s+questions/i.test(content)) {
    const oqBlockMatch = content.match(/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|\n##\s+Work|$)/i);
    const oqBlock = oqBlockMatch ? oqBlockMatch[0] : '';
    if (isStrictActive && /\[NEEDS CLARIFICATION:.*?\]/i.test(oqBlock)) {
      errors.push("Goal is marked 'ready' or active, but still contains unresolved '[NEEDS CLARIFICATION: ...]' in Open questions.");
    }
  }

  // Article I: Zero Mocks / Zero Stubs Enforcement
  if (/\b(?:mocks?(?:\s+implementation|\s+fallback|\s+allowed|\s+permitted|\s+data)|stubs?(?:\s+allowed|\s+permitted|\s+fallback|\s+implementation))\b/i.test(content)) {
    errors.push("Article I Zero-Mock Invariant Violation: Mocks, stubs, or fallbacks explicitly declared in goal file.");
  }

  // Work Steps Atomic Contract Validation
  const stepMatches = content.match(/###\s+Step\s+\d+[\s\S]*?(?=(?:###\s+Step\s+\d+|##\s+In\b|$))/gi) || [];
  if (stepMatches.length < 3) {
    errors.push(`Structured Atomic Work Steps must contain at least 3 atomic steps; found ${stepMatches.length}.`);
  }
  for (let i = 0; i < stepMatches.length; i++) {
    const stepText = stepMatches[i];
    const stepNum = i + 1;
    if (!/\*\*Allowed files:\*\*/i.test(stepText)) {
      errors.push(`Step ${stepNum} is missing '**Allowed files:**' boundary declaration.`);
    }
    if (!/\*\*Actions:\*\*/i.test(stepText)) {
      errors.push(`Step ${stepNum} is missing '**Actions:**' ordered contract.`);
    } else if (!/\n\s*\d+\.\s+/i.test(stepText)) {
      errors.push(`Step ${stepNum} '**Actions:**' must contain ordered numerical action items (e.g. 1. ... 2. ...).`);
    }
    if (!/\*\*Completion gate:\*\*/i.test(stepText)) {
      errors.push(`Step ${stepNum} is missing '**Completion gate:**' exit criteria.`);
    }
    if (!/\*\*Stop condition:\*\*/i.test(stepText)) {
      errors.push(`Step ${stepNum} is missing '**Stop condition:**' blocker criteria.`);
    }
  }

  // Canonical 6-Phase Standard Check for Canonical Template
  if (filename === '_template.md') {
    if (stepMatches.length !== 6) {
      errors.push(`Canonical _template.md must contain exactly 6 standard Red-Green-Refactor steps; found ${stepMatches.length}.`);
    }
    const requiredPhases = [
      /Clarification|Socratic/i,
      /Baseline\s+Freeze|Blocker\s+Replication/i,
      /Exact-HEAD|Mutation\s+Sensitivity/i,
      /Concrete\s+Implementation|Zero\s+Mocks/i,
      /Episode\s+Oracle|Raw-Trial/i,
      /Master\s+Replication|Release\s+Certification/i
    ];
    for (let p = 0; p < requiredPhases.length; p++) {
      if (stepMatches[p] && !requiredPhases[p].test(stepMatches[p])) {
        errors.push(`Template Step ${p + 1} does not match canonical phase pattern ${requiredPhases[p]}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passedCount,
    totalCount: REQUIRED_SECTIONS.length,
    goalId,
    filename,
    filePath
  };
}

/**
 * Standardizes/repairs a goal file by injecting missing boilerplate sections.
 */
export function autoRepairGoal(filePath) {
  if (!existsSync(filePath)) return false;
  let content = readFileSync(filePath, 'utf8');
  const filename = basename(filePath);
  const goalIdMatch = filename.match(/G-[A-Za-z0-9_-]+/i) || content.match(/^#\s+(G-(?:[A-Za-z0-9_-]+|xxx)):/im);
  const goalId = goalIdMatch ? (goalIdMatch[1] || goalIdMatch[0]).toUpperCase() : 'G-XXX';

  // Extract existing sections or fallback
  const title = (/^#\s+G-(?:\d+[a-z]?|xxx):\s+(.+)/im.test(content))
    ? content.match(/^#\s+G-(?:\d+[a-z]?|xxx):\s+(.+)/im)[1]
    : filename.replace(/\.md$/i, '').replace(/_/g, ' ');

  const statusMatch = content.match(/\*\*Status:\*\*\s*([^\n]+)/i);
  const status = statusMatch ? statusMatch[1].trim() : 'draft';

  const kindMatch = content.match(/\*\*Kind:\*\*\s*([^\n]+)/i);
  const kind = kindMatch ? kindMatch[1].trim() : 'feature';

  const atomicMatch = content.match(/\*\*Atomic outcome:\*\*\s*([^\n]+)/i);
  const atomicOutcome = atomicMatch ? atomicMatch[1].trim() : 'One independently verifiable outcome; one goal must not contain multiple deliverables';

  const epicMatch = content.match(/\*\*Epic:\*\*\s*([^\n]+)/i);
  const epic = epicMatch ? epicMatch[1].trim() : '—';

  const dependsMatch = content.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
  const dependsOn = dependsMatch ? dependsMatch[1].trim() : '—';

  const blocksMatch = content.match(/\*\*Blocks:\*\*\s*([^\n]+)/i);
  const blocks = blocksMatch ? blocksMatch[1].trim() : '—';

  const stabilityMatch = content.match(/\*\*Spec stability:\*\*\s*([^\n]+)/i);
  const stability = stabilityMatch ? stabilityMatch[1].trim() : 'clarify pending · spec check pending · analyze pending';

  let rebuilt = `# ${goalId}: ${title}\n\n`;
  rebuilt += `**Status:** ${status}  \n`;
  rebuilt += `**Kind:** ${kind}  \n`;
  rebuilt += `**Atomic outcome:** ${atomicOutcome}  \n`;
  rebuilt += `**Epic:** ${epic}  \n`;
  rebuilt += `**Depends on:** ${dependsOn}  \n`;
  rebuilt += `**Blocks:** ${blocks}  \n`;
  rebuilt += `**Spec stability:** ${stability}\n\n`;

  // Plan
  if (/(?:####|##)\s+Plan[\s\S]*?(?=\n##\s+Context|\n##\s+Intent|$)/i.test(content)) {
    rebuilt += content.match(/(?:####|##)\s+Plan[\s\S]*?(?=\n##\s+Context|\n##\s+Intent|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `#### Plan\n\n**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP\n\n| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |\n|:------:|:----:|:-------:|:------:|:----:|\n| **●** | ○ | ○ | ○ | ○ |\n\n| # | Step | Status |\n|---|------|--------|\n| 1 | Architecture & Specification Alignment | pending |\n| 2 | Implementation of Domain Logic & Endpoints | pending |\n| 3 | Verification & Automated Test Pass | pending |\n\n`;
  }

  // Context
  if (/##\s+Context[\s\S]*?(?=\n##\s+Intent|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Context[\s\S]*?(?=\n##\s+Intent|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Context\n\n1–3 sentences: Placement in product, initiative, legacy gap, or linked ADR.\n\n`;
  }

  // Intent
  if (/##\s+Intent[\s\S]*?(?=\n##\s+Atomicity|\n##\s+How|\n##\s+Open|$)/i.test(content)) {
    let intentContent = content.match(/##\s+Intent[\s\S]*?(?=\n##\s+Atomicity|\n##\s+How|\n##\s+Open|$)/i)[0].trim();
    if (!/\*\*Why:\*\*/i.test(intentContent)) intentContent += `\n\n**Why:** [Problem or opportunity]`;
    if (!/\*\*Done when:\*\*/i.test(intentContent)) intentContent += `\n\n**Done when:** [Concrete observable deliverable]`;
    if (!/\*\*Unblocks:\*\*/i.test(intentContent)) intentContent += `\n\n**Unblocks:** —`;
    rebuilt += intentContent + '\n\n';
  } else {
    rebuilt += `## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*\n\n**Why:** [Problem or opportunity — what breaks if we skip this?]\n\n**Done when:** [Concrete observable deliverable / doc state]\n\n**Unblocks:** [Downstream goals or repos]\n\n`;
  }

  // Atomicity & Zero-Mock Contract
  if (/##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]*?(?=\n##\s+How|\n##\s+Open|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]*?(?=\n##\s+How|\n##\s+Open|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Atomicity & Zero-Mock Contract\n\n- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.\n- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.\n- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.\n- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.\n- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.\n\n`;
  }

  // How
  if (/##\s+How[\s\S]*?(?=\n##\s+Open|\n##\s+Knowledge|$)/i.test(content)) {
    rebuilt += content.match(/##\s+How[\s\S]*?(?=\n##\s+Open|\n##\s+Knowledge|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## How *(PLAN only — leave empty while draft)*\n\n**Stack / approach:** —\n\n`;
  }

  // Open questions
  if (/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Open questions *(block ready while any [NEEDS CLARIFICATION] remain)*\n\n- [ ] [NEEDS CLARIFICATION: Unspecified domain boundaries or schemas]\n\n`;
  }

  // Knowledge links
  if (/##\s+Knowledge\s+links[\s\S]*?(?=\n##\s+Context\s+manifest|\n##\s+Work|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Knowledge\s+links[\s\S]*?(?=\n##\s+Context\s+manifest|\n##\s+Work|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Knowledge links\n\n| Type | IDs |\n|------|-----|\n| **Pains addressed** | P-001 |\n| **Decisions** | ADR-001 |\n| **Assumptions required** | — |\n| **Evidence** | \`docs/06_raw/\` |\n\n`;
  }

  // Context manifest
  if (/##\s+Context\s+manifest[\s\S]*?(?=\n##\s+Work|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Context\s+manifest[\s\S]*?(?=\n##\s+Work|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Context manifest\n\n| Kind | IDs / paths |\n|------|-------------|\n| **ADR** | — |\n| **PDR** | — |\n| **Patterns** | Clean Architecture, Zero Mocks, Type-Safe Contracts |\n| **Acceptance** | \`docs/02-product/acceptance/${goalId}.md\` |\n| **Skills** | \`soda-rest-api\` · \`soda-testing\` |\n| **Profile** | developer |\n| **Task type** | feature |\n| **Playbook** | \`docs/06-workflows/dev-loop.md\` |\n| **Default role** | developer |\n| **Files** | \`code/**\` |\n| **Constraints** | Zero mocks, 100% test coverage |\n\n`;
  }

  // Work steps
  if (/##\s+Work\s+steps[\s\S]*?(?=\n##\s+In\b|$)/i.test(content) && /###\s+Step\s+\d+[\s\S]+?\*\*Allowed files:\*\*[\s\S]+?\*\*Actions:\*\*[\s\S]+?\*\*Completion gate:\*\*[\s\S]+?\*\*Stop condition:\*\*/i.test(content)) {
    rebuilt += content.match(/##\s+Work\s+steps[\s\S]*?(?=\n##\s+In\b|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Work steps\n\n### Step 1 — Clarification, Socratic 5-Why Dialectic & BDD Specification\n\n**Allowed files:** \`docs/02-product/acceptance/${goalId}.md\` · \`docs/06_raw/\`  \n**Actions:**\n\n1. Resolve open ambiguities and mark clarification complete.\n2. Conduct Socratic 5-Why dialectic root cause analysis across 5 branches down to Level 5.\n3. Formulate Given-When-Then BDD acceptance scenarios defining exact quantitative bounds.\n\n**Completion gate:** Acceptance contract and Level-5 Socratic 5-Why report created and linked.  \n**Stop condition:** Any unverified assumption or unresolved \`[NEEDS CLARIFICATION]\`.\n\n### Step 2 — Baseline Freeze & Blocker Replication Proof\n\n**Allowed files:** \`docs/06_raw/\` · \`tests/\`  \n**Actions:**\n\n1. Record pre-implementation Git HEAD SHA provenance.\n2. Construct deterministic failing test case reproducing the defect or unhandled edge condition.\n3. Capture empirical command output and verify fail-closed behavior before any code modification.\n\n**Completion gate:** Deterministic replication artifact recorded in \`docs/06_raw/\` with failing test proof.  \n**Stop condition:** Inability to reliably reproduce the defect against the frozen baseline.\n\n### Step 3 — Exact-HEAD Provenance & Isolated Mutation Sensitivity Testing\n\n**Allowed files:** \`scripts/harness/\`  \n**Actions:**\n\n1. Author isolated mutation test harness validating mathematical, state, and boundary invariants.\n2. Introduce controlled fault mutations and verify 100% of mutation vectors are caught.\n\n**Completion gate:** 100% mutation detection rate certified in isolated mutation testing harness.  \n**Stop condition:** Any mutation test false negative or undetected fault injection.\n\n### Step 4 — Concrete Implementation (Zero Mocks, Zero Stubs, Zero Fallbacks)\n\n**Allowed files:** \`pybricks/robotics/\` · \`lib/pbio/\` · \`tests/virtualhub/\`  \n**Actions:**\n\n1. Implement production domain logic, state machines, and driver bindings strictly within the touch map.\n2. Mirror full functionality in the simulator/virtual runtime ensuring complete architectural parity.\n3. Enforce fail-closed error handling and disarm actuators on failure.\n\n**Completion gate:** Code compiles with zero warnings; all unit tests pass with zero mocks or stubs.  \n**Stop condition:** Any compiler warning, mock object leak, or runtime failure.\n\n### Step 5 — Real-World Episode Oracle & Measured Raw-Trial Execution\n\n**Allowed files:** \`tests/\` · \`docs/06_raw/\`  \n**Actions:**\n\n1. Execute $N \\ge 10$ real kernel episodes or physical hardware trials under varying operating conditions.\n2. Record raw per-trial JSON/CSV metrics (trial ID, elapsed wall time, completion state, error).\n3. Compute Wilson score 95% confidence interval and verify non-overlapping rejection thresholds.\n\n**Completion gate:** Empirical raw-trial schema validated with 100% success rate and Wilson 95% CI $\\ge 0.85$.  \n**Stop condition:** Any trial failure or empirical confidence interval falling below safety threshold.\n\n### Step 6 — Master Replication Gate Verification & Release Certification\n\n**Allowed files:** \`scripts/harness/\` · \`docs/06_raw/\` · \`docs/07-backlog/\`  \n**Actions:**\n\n1. Build and execute automated master replication harness verifying all release gates.\n2. Run full test discovery, clean native builds, whitespace audit, and CI governance checks.\n3. Publish release gate certification report and transition goal status to \`review\`.\n\n**Completion gate:** Master replication harness passes 100% of gates; governance check passes.  \n**Stop condition:** Any failing gate, whitespace violation, or governance discrepancy.\n\n`;
  }


  // In
  if (/##\s+In\b[\s\S]*?(?=\n##\s+Out\b|$)/i.test(content)) {
    rebuilt += content.match(/##\s+In\b[\s\S]*?(?=\n##\s+Out\b|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## In\n\n- Concrete in-scope deliverable\n\n`;
  }

  // Out
  if (/##\s+Out\b[\s\S]*?(?=\n##\s+Change\s+delta|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Out\b[\s\S]*?(?=\n##\s+Change\s+delta|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Out\n\n- Out-of-scope boundaries\n\n`;
  }

  // Change delta
  if (/##\s+Change\s+delta[\s\S]*?(?=\n##\s+Software|\n##\s+Spec\s+checklist|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Change\s+delta[\s\S]*?(?=\n##\s+Software|\n##\s+Spec\s+checklist|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Change delta *(brownfield)*\n\n| Area | Action | Path / behaviour |\n|------|--------|------------------|\n| — | ADD / CHANGE / REMOVE | — |\n\n`;
  }

  // Software & Architecture Design
  if (/##\s+Software\s+&\s+Architecture\s+Design[\s\S]*?(?=\n##\s+Spec\s+checklist|\n##\s+Acceptance|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Software\s+&\s+Architecture\s+Design[\s\S]*?(?=\n##\s+Spec\s+checklist|\n##\s+Acceptance|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Software & Architecture Design *(AI Agent — PLAN phase)*\n\n| Architectural Dimension | Specification / Invariant |\n|---|---|\n| **System Archetype** | \`backend-service\` / \`fullstack\` |\n| **Bounded Context & Domain** | Application Domain |\n| **Ports & Adapters Topology** | Driving: API Gateway / HTTP <br> Driven: Database / Messaging |\n| **State Machine & Invariants** | Strict state machine lifecycle |\n| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations |\n| **Socratic 5-Why Blueprint** | Linked Dialectic Report |\n\n`;
  }

  // Spec checklist
  if (/##\s+Spec\s+checklist[\s\S]*?(?=\n##\s+Acceptance|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Spec\s+checklist[\s\S]*?(?=\n##\s+Acceptance|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Spec checklist *(required \`[x]\` before \`ready\`)*\n\n- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)\n- [x] How is filled with architecture and stack details after clarify\n- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)\n- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions\n- [x] In / Out unambiguous; Out matches project brief Out\n- [x] Acceptance criteria each testable or reviewable\n- [x] Touch map is real repo paths\n- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR\n- [x] Change delta filled if modifying existing behaviour\n- [x] Critical-path assumptions are verified and active\n\n`;
  }

  // Acceptance criteria
  if (/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Acceptance criteria\n\n- [ ] Automated verification pass completes green\n- [ ] Concrete functional criteria met\n\n`;
  }

  // Test plan
  if (/##\s+Test\s+plan[\s\S]*?(?=\n##\s+Touch\s+map|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Test\s+plan[\s\S]*?(?=\n##\s+Touch\s+map|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Test plan\n\n- \`npm test\`\n- Real zero-mock execution commands\n\n`;
  }

  // Touch map
  if (/##\s+Touch\s+map[\s\S]*?(?=\n##\s+Notes\s+for\s+AI|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Touch\s+map[\s\S]*?(?=\n##\s+Notes\s+for\s+AI|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Touch map\n\n- \`code/**\`\n\n`;
  }

  // Notes for AI
  if (/##\s+Notes\s+for\s+AI[\s\S]*?(?=\n---\n\n##\s+🏛️?\s*Comprehensive|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Notes\s+for\s+AI[\s\S]*?(?=\n---\n\n##\s+🏛️?\s*Comprehensive|$)/i)[0].trim() + '\n\n';
  } else if (/##\s+Notes\s+for\s+AI[\s\S]*$/i.test(content)) {
    rebuilt += content.match(/##\s+Notes\s+for\s+AI[\s\S]*$/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Notes for AI\n\n- Read architecture documentation before execution\n- Zero mocks, zero stubs, zero fallbacks\n\n`;
  }

  // Comprehensive Spec Design Appendix
  if (/##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix[\s\S]*$/i.test(content)) {
    rebuilt += '---\n\n' + content.match(/##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix[\s\S]*$/i)[0].trim() + '\n';
  } else {
    rebuilt += `---\n\n## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*\n\n> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (\`Zero-Mock & Deterministic Contract\`).\n\n### 1. Finite State Machine (FSM) Matrix & Saga Compensations\n\n| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |\n|---|---|---|---|---|\n| \`State::Idle\` | System bootstrap / Intent intake | Validated schema input | Transition to \`State::Pending\` | Reject with 400 Bad Request |\n| \`State::Pending\` | Authorization & Pre-flight check | Auth & rate-limit valid | Transition to \`State::Processing\` | Return 401 Unauthorized / 429 |\n| \`State::Processing\` | Domain execution / Port call | Invariant: Zero float math | Transition to \`State::Success\` | Trigger Saga Compensation rollback |\n| \`State::Success\` | Event published / Response emitted | 100% concrete types | Disburse / Persist outcome | Audit ledger entry written |\n| \`State::DisputeFrozen\` | Customer dispute / Holdback trigger | 14-day warranty window | Freeze release daemon | Human review gate / Credit note |\n\n### 2. Mathematical & Data Invariants\n\n| Dimension | Standard / Specification |\n|---|---|\n| **Currency & Monetary Math** | Exact Satang integer arithmetic (\`i64\`/\`u64\` Satang/Cents). **ZERO float math**. |\n| **Identifiers & Keys** | Time-ordered UUIDv7 (\`uuid::Uuid::now_v7()\`) or nanoid prefix (\`ord_xxx\`, \`usr_xxx\`). |\n| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (\`chrono::Utc::now()\`). |\n| **Idempotency & Deduplication** | \`Idempotency-Key\` header with 24-hour distributed Redis lock lease. |\n\n### 3. Hexagonal Inbound & Outbound Ports Specification\n\n| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |\n|---|---|---|---|\n| **Driving (Inbound)** | \`HttpServerPort\` / \`EventConsumerPort\` | Axum HTTP/2 / NATS JetStream | \`code/apps/services/.../src/adapters/inbound/\` |\n| **Driven (Outbound)** | \`DatabasePort\` / \`PaymentGatewayPort\` | SQLx PostgreSQL / Stripe Omise RPC | \`code/apps/services/.../src/adapters/outbound/\` |\n\n### 4. UI/UX 5-State Matrix *(Applies when Kind is \`design\` or UI component)*\n\n| UI State | Rendering Contract | Design Token / Tailwind Specs |\n|---|---|---|\n| **1. Default / Idle** | Primary component surface rendered with baseline data | \`bg-surface-elevated text-content-primary rounded-lg border border-border-subtle\` |\n| **2. Loading / Pending** | Accessible shimmer skeleton sweep (\`aria-busy="true"\`) | \`animate-pulse bg-surface-muted rounded\` |\n| **3. Empty State** | Helpful illustration + actionable call-to-action button | \`text-content-secondary flex flex-col items-center justify-center p-8\` |\n| **4. Error State** | Human-readable error message + Retry trigger button | \`bg-status-error-subtle text-status-error border-status-error rounded-md p-4\` |\n| **5. Success State** | Celebratory / updated state with spring micro-animation | \`bg-status-success-subtle text-status-success transition-all duration-200\` |\n`;
  }

  writeFileSync(filePath, rebuilt, 'utf8');
  return true;
}

/**
 * Resolves goal file path from ID or direct path
 */
export function resolveGoalFile(target, baseDir = process.cwd()) {
  if (!target) return null;
  const directPath = resolve(baseDir, target);
  if (existsSync(directPath) && statSync(directPath).isFile()) {
    return directPath;
  }

  const goalIdMatch = target.match(/G-[A-Za-z0-9_-]+/i);
  if (goalIdMatch) {
    const goalId = goalIdMatch[0].toUpperCase();
    const searchDirs = [
      resolve(baseDir, 'docs/07-backlog/goals'),
      resolve(baseDir, 'docs/07-backlog/goals/_archived'),
      resolve(baseDir, 'template/docs/07-backlog/goals'),
      resolve(baseDir, 'template/docs/07-backlog/goals/_archived')
    ];

    for (const sDir of searchDirs) {
      if (existsSync(sDir)) {
        const files = readdirSync(sDir);
        const matched = files.find(f => (f.toUpperCase().startsWith(goalId) || f.toUpperCase().startsWith(`${goalId}-`)) && f.endsWith('.md'));
        if (matched) {
          return join(sDir, matched);
        }
      }
    }
  }
  return null;
}

/**
 * Main harness runner
 */
export function runGoalConformanceHarness(argv = process.argv.slice(2)) {
  console.log("================================================================================");
  console.log("🛡️ Soda OS Goal Template Conformance & Validation Harness");
  console.log("================================================================================\n");

  const doFix = argv.includes('--fix');
  const scanAll = argv.includes('--all');
  const scanActive = argv.includes('--active');
  const scanLegacy = argv.includes('--legacy');
  const jsonOutput = argv.includes('--json');
  const nonFlags = argv.filter(a => !a.startsWith('-'));

  const baseDir = process.cwd();
  const templateGoal = resolve(baseDir, 'template/docs/07-backlog/goals/_template.md');
  const rootTemplateGoal = resolve(baseDir, 'docs/07-backlog/goals/_template.md');

  const filesToValidate = [];

  if (nonFlags.length > 0) {
    for (const target of nonFlags) {
      const resolved = resolveGoalFile(target, baseDir);
      if (resolved) {
        filesToValidate.push(resolved);
      } else {
        console.error(`❌ [${target}] Goal file not found in docs/07-backlog/goals/ or template/`);
        process.exit(1);
      }
    }
  } else if (scanLegacy) {
    const archivedDir = resolve(baseDir, 'docs/07-backlog/goals/_archived');
    if (existsSync(archivedDir)) {
      const files = readdirSync(archivedDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
      files.forEach(f => filesToValidate.push(join(archivedDir, f)));
    }
  } else if (scanActive) {
    if (existsSync(rootTemplateGoal)) filesToValidate.push(rootTemplateGoal);
    else if (existsSync(templateGoal)) filesToValidate.push(templateGoal);

    const activeGoalsDir = resolve(baseDir, 'docs/07-backlog/goals');
    if (existsSync(activeGoalsDir)) {
      const files = readdirSync(activeGoalsDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
      files.forEach(f => filesToValidate.push(join(activeGoalsDir, f)));
    }
  } else if (scanAll) {
    if (existsSync(rootTemplateGoal)) filesToValidate.push(rootTemplateGoal);
    else if (existsSync(templateGoal)) filesToValidate.push(templateGoal);

    const searchDirs = [
      resolve(baseDir, 'docs/07-backlog/goals'),
      resolve(baseDir, 'docs/07-backlog/goals/_archived'),
      resolve(baseDir, 'template/docs/07-backlog/goals')
    ];
    for (const sDir of searchDirs) {
      if (existsSync(sDir)) {
        const files = readdirSync(sDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
        files.forEach(f => {
          const p = join(sDir, f);
          if (!filesToValidate.includes(p)) filesToValidate.push(p);
        });
      }
    }
  } else {
    // Default mode: validate template and any active goals
    if (existsSync(rootTemplateGoal)) filesToValidate.push(rootTemplateGoal);
    else if (existsSync(templateGoal)) filesToValidate.push(templateGoal);

    const activeGoalsDir = resolve(baseDir, 'docs/07-backlog/goals');
    if (existsSync(activeGoalsDir)) {
      const files = readdirSync(activeGoalsDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
      files.forEach(f => {
        const p = join(activeGoalsDir, f);
        if (!filesToValidate.includes(p)) filesToValidate.push(p);
      });
    }
  }

  if (filesToValidate.length === 0) {
    if (existsSync(rootTemplateGoal)) filesToValidate.push(rootTemplateGoal);
    else if (existsSync(templateGoal)) filesToValidate.push(templateGoal);
  }

  let totalGoalsPassed = 0;
  let totalGoalsFailed = 0;
  const results = [];

  for (const file of filesToValidate) {
    if (doFix) {
      autoRepairGoal(file);
    }
    const res = validateGoalConformance(file);
    results.push(res);

    const relPath = relative(baseDir, file);
    console.log(`▶ Verifying ${basename(file)} (${relPath})...`);

    if (res.valid) {
      console.log(`  ✅ 100% Conformance Verified (${res.passedCount}/${res.totalCount} sections & invariants passed)\n`);
      totalGoalsPassed++;
    } else {
      res.errors.forEach(e => console.error(`  ❌ ${e}`));
      console.error(`  ⚠️ Failed with ${res.errors.length} template deviations.\n`);
      totalGoalsFailed++;
    }
    if (res.warnings.length > 0) {
      res.warnings.forEach(w => console.warn(`  ⚠️ Warning: ${w}`));
    }
  }

  console.log("================================================================================");
  console.log(`📊 Summary: ${totalGoalsPassed} Passed, ${totalGoalsFailed} Failed`);
  console.log("================================================================================\n");

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  }

  return totalGoalsFailed === 0;
}

// Auto-execute if run as script
const isDirectScript = process.argv[1] && (
  process.argv[1].endsWith('goal-template-conformance-harness.mjs')
);

if (isDirectScript) {
  const success = runGoalConformanceHarness(process.argv.slice(2));
  process.exit(success ? 0 : 1);
}
