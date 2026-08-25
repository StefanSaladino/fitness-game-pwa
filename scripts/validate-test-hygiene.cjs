const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const fail = (message) => { throw new Error(`Test hygiene validation failed: ${message}`); };
const testFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name) || /\.test\.sql$/.test(entry.name)) testFiles.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'tests'));
walk(path.join(root, 'supabase', 'tests'));

const scriptsDir = path.join(root, 'scripts');
const scripts = fs.existsSync(scriptsDir)
  ? fs.readdirSync(scriptsDir)
      .filter((name) => name.endsWith('.cjs') && name !== 'validate-test-hygiene.cjs')
      .map((name) => path.join(scriptsDir, name))
  : [];

const docPathLiteral = (value) => {
  const s = String(value).replace(/\\/g, '/');
  return /(^|\/)docs\//i.test(s)
    || /(^|\/)(README|CHANGELOG)\.md$/i.test(s)
    || /ROADMAP\.md$/i.test(s)
    || /\.md$/i.test(s);
};

const jsTestPathLiteral = (value) => {
  const s = String(value).replace(/\\/g, '/');
  if (/\.test\.sql$/i.test(s)) return false;
  return /\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/i.test(s)
    || /^tests\/.+\.(?:[cm]?[jt]sx?)$/i.test(s);
};

for (const file of scripts) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sf.parseDiagnostics.length) fail(`validation script does not parse: ${path.basename(file)}`);

  const badDocs = [];
  const badTests = [];
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (docPathLiteral(node.text)) badDocs.push(node.text);
      if (/^(?:validate-|run-structural-validation)/.test(path.basename(file)) && jsTestPathLiteral(node.text)) badTests.push(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (badDocs.length) {
    fail(`documentation is referenced by executable validation: ${path.basename(file)} -> ${[...new Set(badDocs)].join(', ')}`);
  }
  if (badTests.length) {
    fail(`structural validator introspects JS/TS test source: ${path.basename(file)} -> ${[...new Set(badTests)].join(', ')}`);
  }
}

const normalized = testFiles.map((file) => ({
  file,
  rel: path.relative(root, file).split(path.sep).join('/'),
}));

const unit = normalized.filter(({ rel }) => rel.startsWith('src/') && /\.test\.(?:ts|tsx)$/.test(rel)).length;
const integration = normalized.filter(({ rel }) => rel.startsWith('tests/integration/') && /\.test\.(?:ts|tsx)$/.test(rel)).length;
const e2e = normalized.filter(({ rel }) => rel.startsWith('tests/e2e/') && /\.spec\.(?:ts|tsx)$/.test(rel)).length;
const pgtap = normalized.filter(({ rel }) => rel.startsWith('supabase/tests/') && /\.test\.sql$/.test(rel)).length;

const ambiguousMainFiles = normalized
  .filter(({ rel }) => /\.(?:test|spec)\.(?:ts|tsx)$/.test(rel))
  .filter(({ file }) => /screen\.getByRole\(\s*['"]main['"]\s*\)/.test(fs.readFileSync(file, 'utf8')))
  .map(({ rel }) => rel);

console.log(`Test hygiene passed: scanned ${unit} unit, ${integration} integration, ${e2e} E2E, and ${pgtap} pgTAP files; documentation is not a release gate.`);
if (ambiguousMainFiles.length > 0) {
  console.warn(`Test hygiene note: ${ambiguousMainFiles.length} test file(s) still use a global role=main query: ${ambiguousMainFiles.join(', ')}. This is advisory only.`);
}
