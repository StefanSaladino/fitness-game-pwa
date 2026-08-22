const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'dist', 'assets');
const maximumChunkBytes = 500_000;

if (!fs.existsSync(assetsDir)) {
  throw new Error('Bundle budget failed: dist/assets does not exist. Run the production build first.');
}

const chunks = fs.readdirSync(assetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({
    file,
    bytes: fs.statSync(path.join(assetsDir, file)).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

if (chunks.length === 0) {
  throw new Error('Bundle budget failed: no production JavaScript chunks were found.');
}

const oversized = chunks.filter((chunk) => chunk.bytes > maximumChunkBytes);
if (oversized.length > 0) {
  const detail = oversized
    .map((chunk) => `${chunk.file}: ${(chunk.bytes / 1000).toFixed(2)} kB`)
    .join(', ');
  throw new Error(`Bundle budget failed: JavaScript chunks must stay at or below 500 kB (${detail}).`);
}

const largest = chunks[0];
console.log(`Bundle budget passed: ${chunks.length} JavaScript chunks; largest is ${largest.file} at ${(largest.bytes / 1000).toFixed(2)} kB.`);
