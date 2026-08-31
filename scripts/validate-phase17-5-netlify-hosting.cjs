const fs = require('node:fs');
const path = require('node:path');

const repo = process.cwd();

function read(relativePath) {
  const fullPath = path.join(repo, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Phase 17.5 hosting gate: missing ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(`Phase 17.5 hosting gate: ${message}`);
  }
}

function forbid(text, pattern, message) {
  if (pattern.test(text)) {
    throw new Error(`Phase 17.5 hosting gate: ${message}`);
  }
}

const netlify = read('netlify.toml');
const redirects = read('public/_redirects');
const envExample = read('.env.example');
const gitignore = read('.gitignore');
const supabaseClient = read('src/lib/supabase.ts');
const packageJson = JSON.parse(read('package.json'));

requireMatch(netlify, /\[build\][\s\S]*command\s*=\s*"npm run build"/, 'Netlify build command must be npm run build.');
requireMatch(netlify, /\[build\][\s\S]*publish\s*=\s*"dist"/, 'Netlify publish directory must be dist.');
requireMatch(netlify, /NODE_VERSION\s*=\s*"24"/, 'Netlify build must use Node 24.');

requireMatch(netlify, /X-Content-Type-Options\s*=\s*"nosniff"/, 'nosniff header is missing.');
requireMatch(netlify, /X-Frame-Options\s*=\s*"DENY"/, 'frame protection header is missing.');
requireMatch(netlify, /Referrer-Policy\s*=\s*"strict-origin-when-cross-origin"/, 'referrer policy is missing.');
requireMatch(netlify, /Permissions-Policy\s*=\s*"camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)"/, 'permissions policy is missing.');

requireMatch(netlify, /for\s*=\s*"\/assets\/\*"[\s\S]*max-age=31536000,\s*immutable/, 'hashed assets must be browser-cacheable and immutable.');
requireMatch(netlify, /for\s*=\s*"\/sw\.js"[\s\S]*max-age=0,\s*must-revalidate/, 'service worker must revalidate.');
requireMatch(netlify, /for\s*=\s*"\/asset-manifest\.json"[\s\S]*max-age=0,\s*must-revalidate/, 'asset manifest must revalidate.');
requireMatch(netlify, /for\s*=\s*"\/manifest\.webmanifest"[\s\S]*max-age=0,\s*must-revalidate/, 'web app manifest must revalidate.');

requireMatch(redirects, /^\s*\/\*\s+\/index\.html\s+200\s*$/m, 'SPA fallback must rewrite all application routes to index.html with status 200.');

forbid(netlify, /VITE_SUPABASE_|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET|sb_secret_|NETLIFY_AUTH_TOKEN|DATABASE_URL|POSTGRES_PASSWORD/i, 'netlify.toml must not contain application credentials or privileged secrets.');

requireMatch(envExample, /^VITE_SUPABASE_URL=/m, '.env.example must document VITE_SUPABASE_URL.');
requireMatch(envExample, /^VITE_SUPABASE_PUBLISHABLE_KEY=/m, '.env.example must document the browser-safe Supabase publishable key.');
requireMatch(envExample, /^VITE_APP_URL=/m, '.env.example must document the optional app-origin override.');
forbid(envExample, /VITE_NETLIFY_CAPACITY_ENABLED/, 'retired Netlify capacity browser switch must not return.');

requireMatch(supabaseClient, /if\s*\(typeof window !== ['"]undefined['"]\)\s*return window\.location\.origin/, 'deploy previews require getAppUrl() to fall back to window.location.origin.');

requireMatch(gitignore, /^\.netlify\/$/m, 'local Netlify CLI state must be ignored.');

if (packageJson.scripts?.['test:hosting'] !== 'node scripts/validate-phase17-5-netlify-hosting.cjs') {
  throw new Error('Phase 17.5 hosting gate: package.json must expose test:hosting.');
}

if (!packageJson.scripts?.['test:structure']?.includes('validate-phase17-5-netlify-hosting.cjs')) {
  throw new Error('Phase 17.5 hosting gate: test:structure must include the hosting contract.');
}


console.log('Phase 17.5 Netlify hosting validation passed: build/publish, SPA routing, safe headers, PWA cache rules, environment boundaries, and preview-origin behavior are locked.');
