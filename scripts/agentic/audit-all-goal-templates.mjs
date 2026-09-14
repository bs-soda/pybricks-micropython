import fs from 'fs';
import path from 'path';

const REPO_ROOT = '/Users/batrarethsudprasert/projects/sodality-creator-hub';
const GOALS_DIR = path.join(REPO_ROOT, 'docs/07-backlog/goals');
const ARCHIVED_DIR = path.join(GOALS_DIR, '_archived');

const REQUIRED_SECTIONS = [
  { name: 'Header Metadata (**Status:**)', pattern: /\*\*Status:\*\*/i },
  { name: 'Intent (## Intent)', pattern: /##\s+Intent/i },
  { name: 'In Scope (## In)', pattern: /##\s+In\b/i },
  { name: 'Out Scope (## Out)', pattern: /##\s+Out\b/i },
  { name: 'Acceptance Criteria (## Acceptance criteria)', pattern: /##\s+Acceptance criteria/i },
  { name: 'Touch Map (## Touch map)', pattern: /##\s+Touch map/i },
];

const EXTENDED_SODA_SECTIONS = [
  { name: 'Context (## Context)', pattern: /##\s+Context/i },
  { name: 'How (## How)', pattern: /##\s+How/i },
  { name: 'Knowledge links (## Knowledge links)', pattern: /##\s+Knowledge links/i },
  { name: 'Context manifest (## Context manifest)', pattern: /##\s+Context manifest/i },
  { name: 'Test plan (## Test plan)', pattern: /##\s+Test plan/i },
];

function auditDir(dir, isArchived = false) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
  const results = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    const missingBasic = REQUIRED_SECTIONS.filter(s => !s.pattern.test(content)).map(s => s.name);
    const missingExtended = EXTENDED_SODA_SECTIONS.filter(s => !s.pattern.test(content)).map(s => s.name);

    results.push({
      file,
      path: fullPath,
      isArchived,
      missingBasic,
      missingExtended,
      isFullyCompliant: missingBasic.length === 0 && missingExtended.length === 0,
      isBasicCompliant: missingBasic.length === 0
    });
  }

  return results;
}

const activeResults = auditDir(GOALS_DIR, false);
const archivedResults = auditDir(ARCHIVED_DIR, true);
const allResults = [...activeResults, ...archivedResults];

console.log(`Total Goal Files: ${allResults.length}`);
console.log(`Active Goals: ${activeResults.length}`);
console.log(`Archived Goals: ${archivedResults.length}`);

const fullyCompliant = allResults.filter(r => r.isFullyCompliant);
const basicCompliant = allResults.filter(r => r.isBasicCompliant && !r.isFullyCompliant);
const nonCompliant = allResults.filter(r => !r.isBasicCompliant);

console.log(`\nCompliant with Full Template: ${fullyCompliant.length}`);
console.log(`Basic Compliant (Has Core In/Out/Acceptance): ${basicCompliant.length}`);
console.log(`Non-Compliant (Missing Core Sections): ${nonCompliant.length}`);

fs.writeFileSync(path.join(REPO_ROOT, '.agentic/goal-audit-report.json'), JSON.stringify({
  total: allResults.length,
  fullyCompliantCount: fullyCompliant.length,
  basicCompliantCount: basicCompliant.length,
  nonCompliantCount: nonCompliant.length,
  activeGoals: activeResults,
  archivedGoals: archivedResults
}, null, 2));

console.log('\nTop Non-Compliant Files (Missing Basic Sections):');
nonCompliant.slice(0, 30).forEach(r => {
  console.log(`- ${r.file} (Archived: ${r.isArchived}) -> Missing: ${r.missingBasic.join(', ')}`);
});
