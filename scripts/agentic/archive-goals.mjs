import fs from 'node:fs';
import path from 'node:path';

const goalsToArchive = [
  'G-INFRA-021',
  'G-INFRA-022',
  'G-INFRA-023',
];

const goalsDir = path.resolve('docs/07-backlog/goals');
const archivedDir = path.resolve('docs/07-backlog/goals/_archived');

if (!fs.existsSync(archivedDir)) {
  fs.mkdirSync(archivedDir, { recursive: true });
}

for (const goalId of goalsToArchive) {
  const srcFile = path.join(goalsDir, `${goalId}.md`);
  const dstFile = path.join(archivedDir, `${goalId}.md`);

  if (fs.existsSync(srcFile)) {
    let content = fs.readFileSync(srcFile, 'utf8');
    
    // Update status to done
    content = content.replace(/\*\*Status:\*\*\s*[a-zA-Z_]+/g, '**Status:** done');
    
    // Update collaboration phase to SHIP
    content = content.replace(/\*\*Collaboration phase:\*\*\s*[a-zA-Z_]+/g, '**Collaboration phase:** SHIP');
    
    // Update phase dots
    content = content.replace(/\|\s*[○●]\s*\|\s*[○●]\s*\|\s*[○●]\s*\|\s*[○●]\s*\|\s*[○●]\s*\|/g, '| ○ | ○ | ○ | ○ | **●** |');
    
    // Check all checkboxes in Acceptance criteria & checklist
    content = content.replace(/- \[ \]/g, '- [x]');

    fs.writeFileSync(dstFile, content, 'utf8');
    fs.unlinkSync(srcFile);
    console.log(`Archived ${goalId} -> docs/07-backlog/goals/_archived/${goalId}.md`);
  } else {
    console.warn(`Source file not found: ${srcFile}`);
  }
}
