const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const modulePath = path.join(repoRoot, 'module.json');

function readModule() {
  return JSON.parse(fs.readFileSync(modulePath, 'utf8'));
}

function writeModule(obj) {
  fs.writeFileSync(modulePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function bumpPatch(version) {
  const parts = version.split('.').map(n => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function main() {
  const m = readModule();
  if (!m.version) {
    console.log('module.json has no version');
    return;
  }
  const old = m.version;
  const next = bumpPatch(old);
  m.version = next;
  writeModule(m);

  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
  execSync('git add module.json');
  execSync(`git commit -m "ci: bump version ${old} -> ${next}" || true`);
  execSync('git push');
  console.log(`Bumped module.json version: ${old} -> ${next}`);
}

main();
