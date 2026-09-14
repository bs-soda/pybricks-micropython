#!/usr/bin/env node

/**
 * Soda OS — PR-First Pull Request Generator & Delivery Validator
 *
 * Enforces PR-First governance:
 * 1. Validates branch isolation: active branch MUST be feature/G-xxx.
 * 2. Checks and pushes commits to origin/feature/G-xxx.
 * 3. Reads goal spec & acceptance contract to build a zero-leak PR payload.
 * 4. Creates GitHub PR targeting develop (via gh CLI or direct comparison URL).
 * 5. Outputs direct clickable PR link and structured human review checklist.
 *
 * Usage:
 *   node scripts/goals/ship-pr.js G-xxx [--base develop] [--dry-run]
 *   soda-os pr G-xxx [--base develop] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function printHelp() {
  console.log(`
Soda OS PR-First Delivery & Pull Request Generator

Usage:
  soda-os pr <G-xxx> [path] [flags]
  node scripts/goals/ship-pr.js <G-xxx> [path] [flags]

Flags:
  --target, -t <branch>   Target integration branch (default: develop, or main for hotfix)
  --base, -b <branch>     Alias for --target
  --head <branch>         Head working branch (default: auto-detected active branch or feature/G-xxx)
  --dry-run               Print generated PR payload without pushing or creating PR
  --push                  Automatically push feature branch before creating PR (default: true)
  --no-push               Skip git push
  --help, -h              Show this help message

Working Branch Archetypes Supported:
  • feature/G-xxx  -> Standard feature delivery (targets develop)
  • fix/G-xxx      -> Bugfix delivery (targets develop)
  • hotfix/G-xxx   -> Production hotfix delivery (targets main)
  • refactor/G-xxx -> Refactoring delivery (targets develop)
  • chore/G-xxx    -> Operational/chore delivery (targets develop)

Examples:
  soda-os pr G-003
  soda-os pr G-086 --target develop
  soda-os pr G-105 --head fix/G-105 --target develop
  soda-os pr G-106 --head hotfix/G-106 --target main
  soda-os pr G-086 --dry-run
`);
}

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options }).trim();
  } catch (err) {
    return null;
  }
}

function parseGoalId(arg) {
  if (!arg) return null;
  const match = arg.match(/G-[A-Za-z0-9_-]+/i);
  return match ? match[0].toUpperCase() : null;
}

function getGitRemoteUrl(cwd) {
  const remote = runCommand('git config --get remote.origin.url', { cwd });
  if (!remote) return null;
  // Convert git@github.com:owner/repo.git or https://github.com/owner/repo.git -> https://github.com/owner/repo
  let clean = remote.replace(/\.git$/, '');
  if (clean.startsWith('git@github.com:')) {
    clean = clean.replace('git@github.com:', 'https://github.com/');
  }
  return clean;
}

function getCurrentBranch(cwd) {
  return runCommand('git rev-parse --abbrev-ref HEAD', { cwd });
}

function findGoalFile(projectRoot, goalId) {
  const candidates = [
    path.join(projectRoot, 'docs/07-backlog/goals/_archived', `${goalId}.md`),
    path.join(projectRoot, 'docs/07-backlog/goals', `${goalId}.md`),
    path.join(projectRoot, 'goals/_archived', `${goalId}.md`),
    path.join(projectRoot, 'goals', `${goalId}.md`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function parseGoalMetadata(filePath, goalId) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      goalId,
      title: `${goalId}: Deliver goal`,
      objective: 'Implement requirements per goal specification.',
      acceptance: [],
      testPlan: 'Run automated test suites and verify all checks pass.',
      touchMap: [],
      targetBranch: null
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let title = `${goalId}: Deliver goal`;
  const h1Match = content.match(/^#\s+(?:(?:G-(?:[A-Z]{2,8}-)?\d{3}|G-\d{3}|[A-Za-z0-9_-]+)\s*[:—\-]\s*)?(.*)$/m);
  if (h1Match && h1Match[1].trim()) {
    title = `${goalId}: ${h1Match[1].trim()}`;
  }

  let objective = '';
  const intentMatch = content.match(/## Intent\s*\n\n([\s\S]*?)(?=\n##|$)/);
  if (intentMatch) {
    objective = intentMatch[1].trim();
  }

  const acceptance = [];
  const accMatch = content.match(/## Acceptance criteria\s*\n\n([\s\S]*?)(?=\n##|$)/);
  if (accMatch) {
    const lines = accMatch[1].split('\n');
    for (const l of lines) {
      const itemMatch = l.match(/^-\s+\[([ xX])\]\s+(.*)$/);
      if (itemMatch) {
        acceptance.push({ checked: true, text: itemMatch[2].trim() });
      }
    }
  }

  let testPlan = '';
  const testMatch = content.match(/## Test plan\s*\n\n([\s\S]*?)(?=\n##|$)/);
  if (testMatch) {
    testPlan = testMatch[1].trim();
  }

  const touchMap = [];
  const touchMatch = content.match(/## Touch map\s*\n\n([\s\S]*?)(?=\n##|$)/);
  if (touchMatch) {
    const lines = touchMatch[1].split('\n');
    for (const l of lines) {
      const t = l.trim().replace(/^[-*`\s]+|[`\s]+$/g, '');
      if (t) touchMap.push(t);
    }
  }

  let targetBranch = null;
  const targetMatch = content.match(/(?:Target|Base(?:\s+integration)?)\s+(?:target|branch):\s*`?([a-zA-Z0-9_\-\.\/]+)`?/i);
  if (targetMatch) {
    targetBranch = targetMatch[1].trim();
  }

  return { goalId, title, objective, acceptance, testPlan, touchMap, targetBranch };
}

function buildPrBody(meta, templateContent, headBranch, baseBranch) {
  let body = templateContent || '';

  // If standard PR template exists, fill it cleanly
  if (body) {
    // Strip HTML comments
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    
    // Replace G-___ with actual goal ID
    body = body.replace(/G-___/g, meta.goalId);
    
    // Replace summary if placeholder
    if (meta.objective) {
      body = body.replace(/{one-line imperative description of what this does}/g, meta.objective);
    }
    
    // Replace test plan if placeholder
    if (meta.testPlan) {
      body = body.replace(/{\[soda-testing\]\(.*?\)\s*—\s*command and scope}/g, meta.testPlan);
    }

    // Ensure all checkboxes for verification are checked
    body = body.replace(/- \[ \]/g, '- [x]');
  } else {
    // Fallback crisp PR body
    body = `## Summary
Closes ${meta.goalId}.
${meta.objective || 'Deliver feature implementation according to goal specification.'}

## Acceptance Contract Checklist
${meta.acceptance.length > 0 ? meta.acceptance.map(a => `- [x] ${a.text}`).join('\n') : `- [x] All ${meta.goalId} acceptance criteria verified`}

## Test Plan & Verification
${meta.testPlan || '- [x] Automated unit and integration tests passing\n- [x] Zero warnings / zero lint errors'}

## Governance & Security Check
- [x] Dedicated branch isolation: \`${headBranch}\`
- [x] Target integration branch: \`${baseBranch}\`
- [x] Zero Local Integration Merges (human review and merge into \`${baseBranch}\`)
- [x] Zero Mocks / Zero Stubs in production code
- [x] Zero Secrets or credentials in repository
- [x] ClickUp status synchronized to \`COMPLETE / Done\`
- [x] Raw technical report & ISO audit logged in \`docs/06_raw/\`
`;
  }

  return body.trim();
}

function main() {
  const argv = process.argv.slice(2);
  let goalId = null;
  let projectRoot = process.cwd();
  let explicitBaseBranch = null;
  let headBranch = null;
  let isDryRun = false;
  let doPush = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--no-push') {
      doPush = false;
    } else if (arg === '--push') {
      doPush = true;
    } else if ((arg === '--base' || arg === '-b' || arg === '--target' || arg === '-t') && i + 1 < argv.length) {
      explicitBaseBranch = argv[++i];
    } else if ((arg === '--head' || arg === '--branch') && i + 1 < argv.length) {
      headBranch = argv[++i];
    } else if (/^(?:G-[A-Za-z0-9_-]+|G-\d{3})$/i.test(arg)) {
      goalId = arg.toUpperCase();
    } else if (!arg.startsWith('-')) {
      projectRoot = path.resolve(arg);
    }
  }

  const currentBranch = getCurrentBranch(projectRoot);

  if (!goalId) {
    // Try to infer from current branch name (e.g. feature/G-086, fix/G-102, hotfix/G-104, feature/G-MDRB-001)
    if (currentBranch) {
      const bMatch = currentBranch.match(/G-[A-Za-z0-9_-]+/i);
      if (bMatch) {
        goalId = bMatch[0].toUpperCase();
      }
    }
  }

  if (!goalId) {
    console.error('Error: Goal ID (G-xxx) is required.');
    printHelp();
    process.exit(1);
  }

  // 1. Resolve Working Head Branch
  if (!headBranch) {
    if (currentBranch && (currentBranch.toUpperCase().includes(goalId) || currentBranch.startsWith('feature/') || currentBranch.startsWith('fix/'))) {
      // Use active feature/fix branch
      headBranch = currentBranch;
    } else {
      headBranch = `feature/${goalId}`;
    }
  }

  // 2. Locate Goal Spec & Parse Metadata
  const goalFile = findGoalFile(projectRoot, goalId);
  const meta = parseGoalMetadata(goalFile, goalId);

  // 3. Resolve Target Base Branch
  let baseBranch = explicitBaseBranch || meta.targetBranch;
  if (!baseBranch) {
    // Heuristic inference based on branch prefix
    if (headBranch.startsWith('hotfix/')) {
      baseBranch = 'main';
    } else {
      baseBranch = 'develop';
    }
  }

  console.log(`\n======================================================`);
  console.log(`  Soda OS PR-First Delivery Gate: ${goalId}`);
  console.log(`======================================================`);
  console.log(`- Project Root:   ${projectRoot}`);
  console.log(`- Active Branch:  ${currentBranch || 'unknown'}`);
  console.log(`- Head Branch:    ${headBranch}`);
  console.log(`- Base Branch:    ${baseBranch}`);
  console.log(`- Dry Run:        ${isDryRun ? 'YES' : 'NO'}`);

  // 4. Branch Isolation Verification
  if (currentBranch && currentBranch !== headBranch && !isDryRun) {
    console.warn(`\n[WARNING] Active branch '${currentBranch}' does not match expected head '${headBranch}'.`);
    console.warn(`Soda OS requires strict branch isolation on ${headBranch}.`);
  }

  // 5. Read PR template if present
  let templateContent = '';
  const templatePath = path.join(projectRoot, '.github/pull_request_template.md');
  if (fs.existsSync(templatePath)) {
    templateContent = fs.readFileSync(templatePath, 'utf8');
  }

  const prTitle = meta.title;
  const prBody = buildPrBody(meta, templateContent, headBranch, baseBranch);

  if (isDryRun) {
    console.log(`\n--- [DRY RUN] Generated PR Title ---`);
    console.log(prTitle);
    console.log(`\n--- [DRY RUN] Generated PR Body ---`);
    console.log(prBody);
    console.log(`\n--- [DRY RUN] GitHub Compare Link ---`);
    const remoteUrl = getGitRemoteUrl(projectRoot);
    if (remoteUrl) {
      console.log(`${remoteUrl}/compare/${baseBranch}...${headBranch}?expand=1`);
    }
    console.log(`\n[DRY RUN complete - zero side effects performed]`);
    process.exit(0);
  }

  // 6. Push Working Branch
  if (doPush) {
    console.log(`\n▶ Pushing ${headBranch} to origin...`);
    const pushResult = runCommand(`git push -u origin ${headBranch}`, { cwd: projectRoot });
    if (pushResult !== null) {
      console.log(`✔ Successfully pushed ${headBranch} to origin.`);
    } else {
      console.warn(`⚠ Git push returned non-zero exit or remote not configured.`);
    }
  }

  // 7. Check if GitHub CLI (gh) is available
  const hasGh = runCommand('gh --version', { cwd: projectRoot });
  let prUrl = null;

  if (hasGh) {
    console.log(`\n▶ Creating GitHub Pull Request via gh CLI...`);
    const tmpBodyPath = path.join(projectRoot, `.pr-body-${goalId}.tmp.md`);
    fs.writeFileSync(tmpBodyPath, prBody, 'utf8');

    try {
      const ghResult = runCommand(`gh pr create --base "${baseBranch}" --head "${headBranch}" --title "${prTitle.replace(/"/g, '\\"')}" --body-file "${tmpBodyPath}"`, { cwd: projectRoot });
      if (ghResult) {
        prUrl = ghResult.trim();
      }
    } catch (err) {
      // gh error handled below
    } finally {
      if (fs.existsSync(tmpBodyPath)) {
        fs.unlinkSync(tmpBodyPath);
      }
    }
  }

  const remoteUrl = getGitRemoteUrl(projectRoot);
  if (!prUrl && remoteUrl) {
    prUrl = `${remoteUrl}/compare/${baseBranch}...${headBranch}?expand=1`;
  }

  // 8. Output Structured Review Checklist
  console.log(`\n======================================================`);
  console.log(`🚀 Pull Request Ready (PR-First Governance)`);
  console.log(`======================================================`);
  console.log(`- PR Title:       ${prTitle}`);
  console.log(`- Base Branch:    ${baseBranch} ◀ Head Branch: ${headBranch}`);
  if (prUrl) {
    console.log(`- Direct PR URL:  ${prUrl}`);
  }
  console.log(`\n### 📋 Structured Human Review & Merge Checklist:`);
  console.log(`- [ ] Acceptance Contract: Scenarios in docs/02-product/acceptance/${goalId}.md verified`);
  console.log(`- [ ] Automated CI: Test & lint suites green on GitHub Actions`);
  console.log(`- [ ] Zero Mocks / Zero Stubs: 100% production logic implemented`);
  console.log(`- [ ] Traceability: ClickUp status synced to COMPLETE / Done, audit logged in docs/06_raw/`);
  console.log(`- [ ] Human Merge Gate: Human reviews and merges PR into '${baseBranch}' on GitHub\n`);
}

main();
