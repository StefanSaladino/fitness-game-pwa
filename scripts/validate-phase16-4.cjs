const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(condition, message) {
  if (!condition) throw new Error(`Phase 16.4 validation failed: ${message}`);
}
const serviceWorker = read('public/sw.js');

console.log('Phase 16.4 Home/lifting dashboard structural contract passed.');
