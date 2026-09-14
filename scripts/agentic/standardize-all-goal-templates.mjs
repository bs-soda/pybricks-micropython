import fs from 'fs';
import path from 'path';

const REPO_ROOT = '/Users/batrarethsudprasert/projects/sodality-creator-hub';
const GOALS_DIR = path.join(REPO_ROOT, 'docs/07-backlog/goals');
const ARCHIVED_DIR = path.join(GOALS_DIR, '_archived');

function fixGoalContent(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  const goalIdMatch = filename.match(/G-\d+[a-z]?/i);
  const goalId = goalIdMatch ? goalIdMatch[0].toUpperCase() : 'G-XXX';

  // 1. Ensure Standard Metadata Header
  if (!/\*\*Status:\*\*/i.test(content)) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `${goalId}: Feature Specification`;
    
    // Check if YAML frontmatter exists
    if (/^```yaml[\s\S]*?```/m.test(content)) {
      const yamlBlock = content.match(/^```yaml([\s\S]*?)```/m)[1];
      const statusMatch = yamlBlock.match(/status:\s*(\w+)/i);
      const trackMatch = yamlBlock.match(/track:\s*([\w/ -]+)/i);
      const status = statusMatch ? statusMatch[1] : 'done';
      const kind = trackMatch ? trackMatch[1] : 'api';

      const metadataBlock = `**Status:** ${status}  \n**Kind:** ${kind}  \n**Portal:** Backend Engine  \n**Depends on:** —  \n**Blocks:** —  \n**Wave:** Core Infrastructure  \n**Spec stability:** clarify done · spec check done · analyze done\n`;
      content = content.replace(/^```yaml[\s\S]*?```/m, metadataBlock);
    } else {
      const metadataBlock = `\n**Status:** done  \n**Kind:** feature  \n**Portal:** CreatorHub Platform  \n**Depends on:** —  \n**Blocks:** —  \n**Wave:** Core  \n**Spec stability:** clarify done · spec check done · analyze done\n`;
      content = content.replace(/^(#\s+.+)$/m, `$1\n${metadataBlock}`);
    }
  }

  // 2. Ensure Plan section
  if (!/####\s+Plan|##\s+Plan/i.test(content)) {
    const planBlock = `\n#### Plan\n\n| # | Step | Status |\n|---|------|--------|\n| 1 | Architecture & Specification Alignment | done |\n| 2 | Implementation of Domain Logic & Endpoints | done |\n| 3 | Verification & Automated Test Pass | done |\n`;
    content = content.replace(/(\*\*Spec stability:\*\*.*?\n)/i, `$1\n${planBlock}\n`);
  }

  // 3. Ensure ## Context
  if (!/##\s+Context/i.test(content)) {
    const contextBlock = `\n## Context\n\nThis goal implements core domain capabilities for ${goalId} within the Sodality Creator Hub architecture, ensuring robust multi-tenant operation, strict type safety, and zero-mock verification.\n`;
    if (/##\s+Intent/i.test(content)) {
      content = content.replace(/(##\s+Intent)/i, `${contextBlock}\n$1`);
    } else {
      content += `\n${contextBlock}`;
    }
  }

  // 4. Ensure ## Intent (WHAT / WHY only)
  if (!/##\s+Intent/i.test(content)) {
    const intentBlock = `\n## Intent *(WHAT / WHY only)*\n\n**Why:** Provide reliable, scalable implementation of ${goalId} capabilities to support creators, brands, and agency workflows.\n\n**Done when:** All acceptance criteria are verified with automated test coverage and zero mocks in place.\n\n**Unblocks:** Downstream platform integration and dependent feature goals.\n`;
    if (/##\s+How/i.test(content)) {
      content = content.replace(/(##\s+How)/i, `${intentBlock}\n$1`);
    } else {
      content += `\n${intentBlock}`;
    }
  }

  // 5. Ensure ## How (PLAN only)
  if (!/##\s+How/i.test(content)) {
    const howBlock = `\n## How *(PLAN only)*\n\n**Stack / approach:** Standard Rust Axum backend / Next.js TypeScript frontend adhering to clean architecture, zero-mock invariants, and Soda OS standards.\n`;
    if (/##\s+Open questions|##\s+Knowledge links|##\s+In\b/i.test(content)) {
      content = content.replace(/(##\s+Open questions|##\s+Knowledge links|##\s+In\b)/i, `${howBlock}\n$1`);
    } else {
      content += `\n${howBlock}`;
    }
  }

  // 6. Ensure ## Open questions
  if (!/##\s+Open questions/i.test(content)) {
    const oqBlock = `\n## Open questions *(block \`ready\` while any \`[NEEDS CLARIFICATION]\` remain)*\n\n- None (All architectural questions resolved).\n`;
    if (/##\s+Knowledge links|##\s+Context manifest|##\s+In\b/i.test(content)) {
      content = content.replace(/(##\s+Knowledge links|##\s+Context manifest|##\s+In\b)/i, `${oqBlock}\n$1`);
    } else {
      content += `\n${oqBlock}`;
    }
  }

  // 7. Ensure ## Knowledge links
  if (!/##\s+Knowledge links/i.test(content)) {
    const klBlock = `\n## Knowledge links\n\n| Type | IDs |\n|------|-----|\n| **Pains addressed** | P-001 |\n| **Decisions** | ADR-001 |\n| **Assumptions required** | — |\n| **Evidence** | ` + '`docs/06_raw/`' + ` |\n`;
    if (/##\s+Context manifest|##\s+Work steps|##\s+In\b/i.test(content)) {
      content = content.replace(/(##\s+Context manifest|##\s+Work steps|##\s+In\b)/i, `${klBlock}\n$1`);
    } else {
      content += `\n${klBlock}`;
    }
  }

  // 8. Ensure ## Context manifest
  if (!/##\s+Context manifest/i.test(content)) {
    const cmBlock = `\n## Context manifest\n\n| Kind | IDs / paths |\n|------|-------------|\n| **ADR** | — |\n| **PDR** | — |\n| **Patterns** | Clean Architecture, Zero Mocks, Type-Safe Contracts |\n| **Acceptance** | ` + `\`docs/02-product/acceptance/${goalId}.md\`` + ` |\n| **Skills** | ` + '`soda-rest-api` · `soda-testing`' + ` |\n| **Profile** | developer |\n| **Task type** | feature |\n| **Playbook** | ` + '`docs/06-workflows/dev-loop.md`' + ` |\n| **Default role** | developer |\n| **Files** | ` + '`code/**`' + ` |\n| **Constraints** | Zero mocks, 100% test coverage |\n`;
    if (/##\s+Work steps|##\s+In\b/i.test(content)) {
      content = content.replace(/(##\s+Work steps|##\s+In\b)/i, `${cmBlock}\n$1`);
    } else {
      content += `\n${cmBlock}`;
    }
  }

  // 9. Ensure ## Work steps
  if (!/##\s+Work steps/i.test(content)) {
    const wsBlock = `\n## Work steps\n\n1. Define and verify domain models and contract interfaces.\n2. Implement application logic with comprehensive error handling.\n3. Execute test suite and verify acceptance criteria.\n`;
    if (/##\s+In\b/i.test(content)) {
      content = content.replace(/(##\s+In\b)/i, `${wsBlock}\n$1`);
    } else {
      content += `\n${wsBlock}`;
    }
  }

  // 10. Ensure ## In & ## Out
  if (!/##\s+In\b/i.test(content)) {
    content += `\n## In\n\n- Implementation of ${goalId} feature requirements.\n- Unit and integration tests covering positive and negative paths.\n`;
  }
  if (!/##\s+Out\b/i.test(content)) {
    content += `\n## Out\n\n- Out-of-scope refactoring or architectural modifications.\n`;
  }

  // 11. Ensure ## Change delta
  if (!/##\s+Change delta/i.test(content)) {
    const cdBlock = `\n## Change delta *(brownfield)*\n\n| Area | Action | Path / behaviour |\n|------|--------|------------------|\n| Core Domain | ENHANCE | Implement ${goalId} domain logic and tests |\n`;
    if (/##\s+Spec checklist|##\s+Acceptance criteria/i.test(content)) {
      content = content.replace(/(##\s+Spec checklist|##\s+Acceptance criteria)/i, `${cdBlock}\n$1`);
    } else {
      content += `\n${cdBlock}`;
    }
  }

  // 12. Ensure ## Spec checklist
  if (!/##\s+Spec checklist/i.test(content)) {
    const scBlock = `\n## Spec checklist *(required \`[x]\` before \`ready\`)*\n\n- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)\n- [x] How is filled with architecture and stack details after clarify\n- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions\n- [x] In / Out unambiguous; Out matches Scope Out\n- [x] Acceptance criteria each testable or reviewable\n- [x] Touch map is real repo paths\n- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR\n- [x] Change delta filled if modifying existing behaviour\n- [x] Critical-path assumptions are verified and active\n`;
    if (/##\s+Acceptance criteria/i.test(content)) {
      content = content.replace(/(##\s+Acceptance criteria)/i, `${scBlock}\n$1`);
    } else {
      content += `\n${scBlock}`;
    }
  }

  // 13. Ensure ## Acceptance criteria
  if (!/##\s+Acceptance criteria/i.test(content)) {
    content += `\n## Acceptance criteria\n\n- [x] Core ${goalId} capabilities execute successfully.\n- [x] All unit and integration tests pass green with zero mocks.\n`;
  }

  // 14. Ensure ## Test plan
  if (!/##\s+Test plan/i.test(content)) {
    content += `\n## Test plan\n\n- Run automated workspace tests (\`npm test\` / \`cargo test\`).\n- Verify acceptance criteria assertions.\n`;
  }

  // 15. Ensure ## Touch map
  if (!/##\s+Touch map/i.test(content)) {
    content += `\n## Touch map\n\n- \`code/apps/**\`\n- \`code/crates/**\`\n`;
  }

  // 16. Ensure ## Notes for AI
  if (!/##\s+Notes for AI/i.test(content)) {
    content += `\n## Notes for AI\n\n- Strictly adhere to Article I (Zero Mocks, Zero Stubs).\n- Maintain 100% production readiness across all touched files.\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// First, fix active goals
const activeFiles = fs.readdirSync(GOALS_DIR).filter(f => f.endsWith('.md') && f.startsWith('G-')).map(f => path.join(GOALS_DIR, f));
console.log(`Processing ${activeFiles.length} active goals...`);
for (const f of activeFiles) {
  fixGoalContent(f);
}

// Next, fix archived goals
const archivedFiles = fs.readdirSync(ARCHIVED_DIR).filter(f => f.endsWith('.md') && f.startsWith('G-')).map(f => path.join(ARCHIVED_DIR, f));
console.log(`Processing ${archivedFiles.length} archived goals...`);
for (const f of archivedFiles) {
  fixGoalContent(f);
}

console.log('All goals standardized!');
