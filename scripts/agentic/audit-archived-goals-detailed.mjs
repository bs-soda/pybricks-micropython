import fs from 'fs';
import path from 'path';

const REPO_ROOT = '/Users/batrarethsudprasert/projects/sodality-creator-hub';
const ARCHIVED_DIR = path.join(REPO_ROOT, 'docs/07-backlog/goals/_archived');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sections = {
    hasStatus: /\*\*Status:\*\*/i.test(content),
    hasIntent: /##\s+Intent/i.test(content),
    hasIn: /##\s+In\b/i.test(content),
    hasOut: /##\s+Out\b/i.test(content),
    hasAcceptance: /##\s+Acceptance criteria/i.test(content),
    hasTouchMap: /##\s+Touch map/i.test(content),
    hasContext: /##\s+Context/i.test(content),
    hasHow: /##\s+How/i.test(content),
    hasKnowledgeLinks: /##\s+Knowledge links/i.test(content),
    hasContextManifest: /##\s+Context manifest/i.test(content),
    hasSpecChecklist: /##\s+Spec checklist/i.test(content),
  };

  const missing = Object.entries(sections).filter(([k, v]) => !v).map(([k]) => k);
  return { missing, isPerfect: missing.length === 0 };
}

const archivedFiles = fs.readdirSync(ARCHIVED_DIR).filter(f => f.endsWith('.md') && f.startsWith('G-')).map(f => path.join(ARCHIVED_DIR, f));

const defective = [];
for (const f of archivedFiles) {
  const { missing, isPerfect } = checkFile(f);
  if (!isPerfect) {
    defective.push({ file: path.basename(f), missing });
  }
}

console.log(`Total Archived: ${archivedFiles.length}`);
console.log(`Defective Archived: ${defective.length}`);
console.log(`Fully Compliant Archived: ${archivedFiles.length - defective.length}`);

console.log('\nList of Defective Archived Goals:');
defective.forEach(d => {
  console.log(`- ${d.file} -> missing: ${d.missing.join(', ')}`);
});
