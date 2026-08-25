const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const fail = (message) => { throw new Error(`Current structural validation failed: ${message}`); };
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const packagePath = path.join(root, 'package.json');
if (!fs.existsSync(packagePath)) fail('package.json is missing');
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(pkg.version))) {
  fail('package version must be valid semver');
}

const manifestPath = path.join(root, 'public', 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const sourceFiles = [];
function walk(dir, matcher) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, matcher);
    else if (matcher(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'), (name) => /\.(?:ts|tsx)$/.test(name));
if (sourceFiles.length === 0) fail('no TypeScript source files found');

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  if (parsed.parseDiagnostics.length) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    fail(`TypeScript syntax does not parse: ${rel}`);
  }
}

const requiredCommands = ['typecheck', 'test', 'test:integration', 'build', 'test:structure', 'test:internal', 'db:test:ci', 'test:e2e'];
for (const name of requiredCommands) {
  if (!pkg.scripts || typeof pkg.scripts[name] !== 'string' || !pkg.scripts[name].trim()) {
    fail(`package script is missing: ${name}`);
  }
}

console.log(`Current structural validation passed: ${sourceFiles.length} TS/TSX sources parse and the supported verification commands are present.`);
