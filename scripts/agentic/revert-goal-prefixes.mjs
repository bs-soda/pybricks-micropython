import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const baseDir = process.cwd();
const goalsDir = resolve(baseDir, 'docs/07-backlog/goals');
const archivedDir = resolve(baseDir, 'docs/07-backlog/goals/_archived');
const goalsMdPath = resolve(baseDir, 'docs/07-backlog/goals.md');

const PREFIX_REGEX = /G-(FIM|AIG|CSI|SCL|CGO)-(\d{3})/g;

console.log('🔄 Starting Reversion of G-{yyy}-xxx to standard G-xxx...');

// 1. Rename files in docs/07-backlog/goals/
if (existsSync(goalsDir)) {
  const files = readdirSync(goalsDir);
  for (const file of files) {
    if (file.endsWith('.md') && /^G-(FIM|AIG|CSI|SCL|CGO)-\d{3}/.test(file)) {
      const newFileName = file.replace(/^G-(FIM|AIG|CSI|SCL|CGO)-(\d{3})/, 'G-$2');
      const oldPath = join(goalsDir, file);
      const newPath = join(goalsDir, newFileName);
      console.log(`Renaming: ${file} -> ${newFileName}`);
      renameSync(oldPath, newPath);
    }
  }
}

// 2. Rename files in docs/07-backlog/goals/_archived/ if any
if (existsSync(archivedDir)) {
  const files = readdirSync(archivedDir);
  for (const file of files) {
    if (file.endsWith('.md') && /^G-(FIM|AIG|CSI|SCL|CGO)-\d{3}/.test(file)) {
      const newFileName = file.replace(/^G-(FIM|AIG|CSI|SCL|CGO)-(\d{3})/, 'G-$2');
      const oldPath = join(archivedDir, file);
      const newPath = join(archivedDir, newFileName);
      console.log(`Renaming archived: ${file} -> ${newFileName}`);
      renameSync(oldPath, newPath);
    }
  }
}

// 3. Update content across all markdown files in docs/07-backlog/goals and _archived
const scanDirs = [goalsDir, archivedDir];
for (const sDir of scanDirs) {
  if (existsSync(sDir)) {
    const files = readdirSync(sDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(sDir, file);
      let content = readFileSync(filePath, 'utf8');
      if (PREFIX_REGEX.test(content)) {
        content = content.replace(PREFIX_REGEX, 'G-$2');
        writeFileSync(filePath, content, 'utf8');
        console.log(`Updated content in: ${file}`);
      }
    }
  }
}

// 4. Update docs/07-backlog/goals.md
if (existsSync(goalsMdPath)) {
  let content = readFileSync(goalsMdPath, 'utf8');
  if (PREFIX_REGEX.test(content)) {
    content = content.replace(PREFIX_REGEX, 'G-$2');
    writeFileSync(goalsMdPath, content, 'utf8');
    console.log(`Updated content in: docs/07-backlog/goals.md`);
  }
}

// 5. Update docs/06_raw/ if any
const rawDir = resolve(baseDir, 'docs/06_raw');
if (existsSync(rawDir)) {
  const files = readdirSync(rawDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = join(rawDir, file);
    let content = readFileSync(filePath, 'utf8');
    if (PREFIX_REGEX.test(content)) {
      content = content.replace(PREFIX_REGEX, 'G-$2');
      writeFileSync(filePath, content, 'utf8');
      console.log(`Updated content in raw: ${file}`);
    }
  }
}

// 6. Update scripts/ if any references exist
const harnessFile = resolve(baseDir, 'scripts/harness/epic-socratic-pipeline-harness.mjs');
if (existsSync(harnessFile)) {
  let content = readFileSync(harnessFile, 'utf8');
  if (PREFIX_REGEX.test(content)) {
    content = content.replace(PREFIX_REGEX, 'G-$2');
    writeFileSync(harnessFile, content, 'utf8');
    console.log(`Updated content in scripts/harness/epic-socratic-pipeline-harness.mjs`);
  }
}

console.log('✅ All G-{yyy}-xxx reverted back to G-xxx successfully!');
