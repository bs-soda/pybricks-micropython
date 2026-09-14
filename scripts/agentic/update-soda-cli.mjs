import fs from 'fs';
import path from 'path';

const SODA_OS_ROOT = '/Users/batrarethsudprasert/projects/soda-os';
const SODA_CLI = path.join(SODA_OS_ROOT, 'cli.js');
const SODA_MANIFEST = path.join(SODA_OS_ROOT, 'template/framework-manifest.yml');

// 1. Update cli.js
let cliContent = fs.readFileSync(SODA_CLI, 'utf8');

if (!cliContent.includes('runHarness')) {
  const harnessFn = `
function runHarness(argv) {
  const scriptPath = [
    path.join(process.cwd(), 'scripts/run-all-soda-harnesses.sh'),
    path.join(TEMPLATE_DIR, 'scripts/run-all-soda-harnesses.sh'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: run-all-soda-harnesses.sh not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync('bash', [scriptPath, ...argv], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}
`;

  cliContent = cliContent.replace(
    /function runDiscovery\(argv\) \{[\s\S]*?\n\}/,
    `$&${harnessFn}`
  );

  cliContent = cliContent.replace(
    /\}\s*else if \(command === 'discovery' \|\| command === 'loop' \|\| command === 'socratic'\) \{[\s\S]*?\n\}/,
    `$& else if (command === 'harness' || command === 'test-harness' || command === 'eval') {\n  runHarness(process.argv.slice(3));\n}`
  );

  fs.writeFileSync(SODA_CLI, cliContent, 'utf8');
  console.log('✔ Updated soda-os/cli.js with `soda-os harness` command.');
}

// 2. Update framework-manifest.yml
let manifestContent = fs.readFileSync(SODA_MANIFEST, 'utf8');
const newHarnessFiles = [
  '- scripts/harness/component-storybook-cdd-harness.mjs',
  '- scripts/harness/realtime-graph-flamegraph-harness.mjs',
  '- scripts/harness/e2e-live-integration-harness.mjs',
  '- scripts/harness/cryptographic-audit-nonce-harness.mjs',
  '- scripts/harness/apalis-stateful-scheduler-harness.mjs',
  '- scripts/harness/rate-limiter-token-bucket-harness.mjs',
  '- scripts/run-all-soda-harnesses.sh',
];

for (const hf of newHarnessFiles) {
  if (!manifestContent.includes(hf)) {
    manifestContent = manifestContent.replace(
      /(- scripts\/harness\/universal-contract-harness\.mjs)/,
      `$1\n  ${hf}`
    );
  }
}

fs.writeFileSync(SODA_MANIFEST, manifestContent, 'utf8');
console.log('✔ Updated soda-os/template/framework-manifest.yml with new harness files.');
