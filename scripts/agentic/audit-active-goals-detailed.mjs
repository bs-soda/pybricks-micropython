import fs from 'fs';
import path from 'path';

const REPO_ROOT = '/Users/batrarethsudprasert/projects/sodality-creator-hub';
const GOALS_DIR = path.join(REPO_ROOT, 'docs/07-backlog/goals');
const ARCHIVED_DIR = path.join(GOALS_DIR, '_archived');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sections = {
    hasStatus: /\*\*Status:\*\*/i.test(content),
    hasPlan: /####\s+Plan|##\s+Plan/i.test(content),
    hasContext: /##\s+Context/i.test(content),
    hasIntent: /##\s+Intent/i.test(content),
    hasHow: /##\s+How/i.test(content),
    hasOpenQuestions: /##\s+Open questions/i.test(content),
    hasKnowledgeLinks: /##\s+Knowledge links/i.test(content),
    hasContextManifest: /##\s+Context manifest/i.test(content),
    hasWorkSteps: /##\s+Work steps/i.test(content),
    hasIn: /##\s+In\b/i.test(content),
    hasOut: /##\s+Out\b/i.test(content),
    hasChangeDelta: /##\s+Change delta/i.test(content),
    hasSpecChecklist: /##\s+Spec checklist/i.test(content),
    hasAcceptance: /##\s+Acceptance criteria/i.test(content),
    hasTestPlan: /##\s+Test plan/i.test(content),
    hasTouchMap: /##\s+Touch map/i.test(content),
    hasNotesForAI: /##\s+Notes for AI/i.test(content),
  };

  const missing = Object.entries(sections).filter(([k, v]) => !v).map(([k]) => k);
  return { missing, isPerfect: missing.length === 0 };
}

const activeFiles = fs.readdirSync(GOALS_DIR).filter(f => f.endsWith('.md') && f.startsWith('G-')).map(f => path.join(GOALS_DIR, f));
const archivedFiles = fs.readdirSync(ARCHIVED_DIR).filter(f => f.endsWith('.md') && f.startsWith('G-')).map(f => path.join(ARCHIVED_DIR, f));

console.log('--- ACTIVE GOALS DETAILED AUDIT ---');
for (const f of activeFiles) {
  const { missing, isPerfect } = checkFile(f);
  if (!isPerfect) {
    console.log(`[ACTIVE] ${path.basename(f)}: missing -> ${missing.join(', ')}`);
  } else {
    console.log(`[ACTIVE] ${path.basename(f)}: 100% PERFECT SODA OS TEMPLATE`);
  }
}
