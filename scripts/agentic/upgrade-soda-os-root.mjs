import fs from 'fs';
import path from 'path';

const REPO_ROOT = '/Users/batrarethsudprasert/projects/sodality-creator-hub';
const SODA_OS_ROOT = '/Users/batrarethsudprasert/projects/soda-os';
const SODA_TEMPLATE = path.join(SODA_OS_ROOT, 'template');

console.log('🚀 Upgrading Soda OS Framework Repository (/Users/batrarethsudprasert/projects/soda-os)...\n');

// 1. Ensure scripts directories in soda-os root
const rootHarnessDir = path.join(SODA_OS_ROOT, 'scripts/harness');
const rootAgenticDir = path.join(SODA_OS_ROOT, 'scripts/agentic');
if (!fs.existsSync(rootHarnessDir)) fs.mkdirSync(rootHarnessDir, { recursive: true });
if (!fs.existsSync(rootAgenticDir)) fs.mkdirSync(rootAgenticDir, { recursive: true });

// Copy all harness files from template/scripts/harness to scripts/harness
const templateHarnessFiles = fs.readdirSync(path.join(SODA_TEMPLATE, 'scripts/harness'));
for (const file of templateHarnessFiles) {
  const src = path.join(SODA_TEMPLATE, 'scripts/harness', file);
  const dst = path.join(rootHarnessDir, file);
  fs.copyFileSync(src, dst);
  console.log(`✔ Copied harness to soda-os/scripts/harness/${file}`);
}

// Copy agentic scripts
const templateAgenticFiles = fs.readdirSync(path.join(SODA_TEMPLATE, 'scripts/agentic'));
for (const file of templateAgenticFiles) {
  const src = path.join(SODA_TEMPLATE, 'scripts/agentic', file);
  const dst = path.join(rootAgenticDir, file);
  fs.copyFileSync(src, dst);
  console.log(`✔ Copied agentic script to soda-os/scripts/agentic/${file}`);
}

// Copy master harness runner
const masterRunnerSrc = path.join(SODA_TEMPLATE, 'scripts/run-all-soda-harnesses.sh');
const masterRunnerDst = path.join(SODA_OS_ROOT, 'scripts/run-all-soda-harnesses.sh');
fs.copyFileSync(masterRunnerSrc, masterRunnerDst);
fs.chmodSync(masterRunnerDst, 0o755);
console.log('✔ Copied master harness runner to soda-os/scripts/run-all-soda-harnesses.sh');

// 2. Sync all skills to soda-os/.agents/skills
const templateSkillsDir = path.join(SODA_TEMPLATE, '.agents/skills');
const rootSkillsDir = path.join(SODA_OS_ROOT, '.agents/skills');
if (!fs.existsSync(rootSkillsDir)) fs.mkdirSync(rootSkillsDir, { recursive: true });

const skillDirs = fs.readdirSync(templateSkillsDir);
for (const skill of skillDirs) {
  const srcSkillDir = path.join(templateSkillsDir, skill);
  const dstSkillDir = path.join(rootSkillsDir, skill);
  if (fs.statSync(srcSkillDir).isDirectory()) {
    if (!fs.existsSync(dstSkillDir)) fs.mkdirSync(dstSkillDir, { recursive: true });
    const skillFiles = fs.readdirSync(srcSkillDir);
    for (const sf of skillFiles) {
      const srcFile = path.join(srcSkillDir, sf);
      const dstFile = path.join(dstSkillDir, sf);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, dstFile);
      }
    }
  }
}
console.log(`✔ Synchronized ${skillDirs.length} skills to soda-os/.agents/skills/`);

// 3. Upgrade soda-os/package.json
const pkgPath = path.join(SODA_OS_ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '1.24.0';
pkg.scripts = {
  test: 'bash scripts/run-all-soda-harnesses.sh',
  harness: 'bash scripts/run-all-soda-harnesses.sh',
  'test:template': 'bash template/scripts/run-all-soda-harnesses.sh'
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✔ Upgraded soda-os/package.json version to 1.24.0 and configured scripts.');

// 4. Update soda-os/template/framework-manifest.yml version to 1.24.0
const manifestPath = path.join(SODA_TEMPLATE, 'framework-manifest.yml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/^version:\s*["']?[\d.]+["']?/m, 'version: "1.24.0"');
fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('✔ Updated soda-os/template/framework-manifest.yml version to 1.24.0.');

// 5. Update soda-os/README.md with harness documentation
const readmePath = path.join(SODA_OS_ROOT, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
if (!readme.includes('soda-os harness')) {
  const harnessSection = `\n## 🧪 Production Test Harnesses

Soda OS ships with a full **4-Layer Production Test Harness Suite**:

- **Component CDD 5-State Harness:** Headless validation of UI Component Contracts (Default, Loading, Error, Empty, Disabled), Storybook 8 CDD metadata, and WCAG 2.2 AAA accessibility.
- **Real-Time 60fps Graph Harness:** High-density telemetry visualization, sub-16.6ms frame budgeting, dual-axis mathematical scaling, and heap memory limits.
- **Multi-Portal Live Integration Harness:** Real-time WebSocket/SSE delta stream integrity, cross-origin auth reflection, and zero-mock cross-portal event propagation.
- **Cryptographic Audit & Nonce Harness:** PCI DSS security boundaries, 24-hour sliding nonce deduplication, and constant-time HMAC-SHA256 guards.
- **Apalis Stateful Scheduler Harness:** PostgreSQL-backed delayed job queues ($T+24\\text{h}$, $T+48\\text{h}$) and recurring cron cursor persistence.
- **Token Bucket Rate Limiter Harness:** Outbound request governors (10 req/s), burst absorption, and RFC 6585 exponential backoff with jitter.

### Running Harnesses:

\`\`\`bash
# Run all enterprise harnesses
soda-os harness

# Or run via npm test
npm test
\`\`\`
`;
  readme += harnessSection;
  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('✔ Documented 4-layer harness suite in soda-os/README.md');
}

console.log('\n🏆 Soda OS Framework Repository Upgrade Complete!');
