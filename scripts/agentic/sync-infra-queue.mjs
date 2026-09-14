import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');
const queuePath = resolve(process.cwd(), 'docs/07-backlog/queues/INFRA.md');

const goalFiles = readdirSync(goalsDir).filter(f => f.startsWith('G-INFRA-') && f.endsWith('.md'));

// Sort naturally
goalFiles.sort((a, b) => {
  const numA = parseInt(a.match(/G-INFRA-(\d+)/)[1], 10);
  const numB = parseInt(b.match(/G-INFRA-(\d+)/)[1], 10);
  return numA - numB;
});

const rows = [];

for (const file of goalFiles) {
  const goalId = file.replace('.md', '');
  const content = readFileSync(join(goalsDir, file), 'utf8');

  // Extract metadata
  const kindMatch = content.match(/\*\*Kind:\*\*\s*([^\n\r]+)/);
  const statusMatch = content.match(/\*\*Status:\*\*\s*([^\n\r]+)/);
  const phaseMatch = content.match(/\*\*Collaboration phase:\*\*\s*([^\n\r]+)/);
  const dependsMatch = content.match(/\*\*Depends on:\*\*\s*([^\n\r]+)/);

  const kind = kindMatch ? kindMatch[1].trim() : 'api';
  const status = statusMatch ? statusMatch[1].trim() : 'draft';
  const phase = phaseMatch ? phaseMatch[1].trim() : 'DEFINE';
  const depends = dependsMatch ? dependsMatch[1].trim() : '—';

  rows.push(`| ${goalId} | ${kind} | ${status} | ${phase} | ${depends} | [../goals/${goalId}.md](../goals/${goalId}.md) |`);
}

const queueContent = `# INFRA Queue

Backlog for INFRA (Platform Foundation & Third-Party APIs).

## Active & Ready

| Goal | Kind | Status | Phase | Depends on | File |
|------|------|--------|-------|------------|------|
${rows.join('\n')}

## Archived

| Goal | Title | Closed | File |
|------|-------|--------|------|
| *(none yet)* | — | — | — |
`;

writeFileSync(queuePath, queueContent, 'utf8');
console.log(`Synchronized ${rows.length} goals in docs/07-backlog/queues/INFRA.md`);
