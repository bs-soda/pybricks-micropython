import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const pathsDir = resolve(process.cwd(), '.agents/skills/tts-openapi-guide/references/oas/paths');
const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');

// Read all goals and their declared endpoints
const goalFiles = readdirSync(goalsDir).filter(f => f.startsWith('G-INFRA-') && f.endsWith('.md'));
const coveredEndpoints = new Set();

for (const file of goalFiles) {
  const content = readFileSync(join(goalsDir, file), 'utf8');
  // Match lines like: Implements `/...` or targeting `/...` or `...`
  const matches = content.matchAll(/\/([a-zA-Z0-9_{}\/-]+)/g);
  for (const m of matches) {
    coveredEndpoints.add('/' + m[1]);
  }
}

// Read all OpenAPI paths
const allOasPaths = [];
const pathFiles = readdirSync(pathsDir).filter(f => f.endsWith('.json'));

for (const pFile of pathFiles) {
  const data = JSON.parse(readFileSync(join(pathsDir, pFile), 'utf8'));
  const moduleName = pFile.replace('.json', '');
  if (data.paths) {
    for (const p of Object.keys(data.paths)) {
      for (const method of Object.keys(data.paths[p])) {
        allOasPaths.push({
          module: moduleName,
          method: method.toUpperCase(),
          path: p,
          summary: data.paths[p][method].summary || '',
          description: data.paths[p][method].description || ''
        });
      }
    }
  }
}

console.log(`Total OpenAPI operations across all 25 modules: ${allOasPaths.length}`);

// Find unmapped operations
const unmapped = [];
for (const op of allOasPaths) {
  // Check if path is in coveredEndpoints
  let found = false;
  for (const ep of coveredEndpoints) {
    if (ep === op.path || op.path.startsWith(ep) || ep.startsWith(op.path)) {
      found = true;
      break;
    }
  }
  if (!found) {
    unmapped.push(op);
  }
}

console.log(`Unmapped operations: ${unmapped.length}`);
console.log(JSON.stringify(unmapped.slice(0, 50), null, 2));
