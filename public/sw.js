const CACHE_PREFIX = 'workout-game-shell-';
const CACHE_VERSION = 'v14-1';
const CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const ASSET_MANIFEST = '/asset-manifest.json';
const CORE_SHELL = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

function sameOriginPath(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function shellAssetPaths(html) {
  const paths = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const path = sameOriginPath(match[1]);
    if (path && path !== '/') paths.add(path);
  }
  return [...paths];
}

function emittedAssetPaths(manifest) {
  if (!manifest || !Array.isArray(manifest.assets)) {
    throw new Error('Asset manifest is missing its assets array.');
  }

  const paths = manifest.assets
    .map((value) => typeof value === 'string' ? sameOriginPath(value) : null)
    .filter(Boolean);

  if (paths.length === 0) throw new Error('Asset manifest contains no emitted assets.');
  return [...new Set(paths)];
}

async function fetchForPrecache(path) {
  const response = await fetch(new Request(path, { cache: 'reload', credentials: 'same-origin' }));
  if (!response.ok) throw new Error(`Unable to precache ${path}: ${response.status}`);
  return response;
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const [rootResponse, manifestResponse] = await Promise.all([
    fetchForPrecache('/'),
    fetchForPrecache(ASSET_MANIFEST),
  ]);
  const html = await rootResponse.clone().text();
  const manifest = await manifestResponse.clone().json();

  await cache.put('/', rootResponse);
  await cache.put(ASSET_MANIFEST, manifestResponse);

  const discovered = shellAssetPaths(html);
  const emitted = emittedAssetPaths(manifest);
  const paths = [...new Set([...CORE_SHELL, ...discovered, ...emitted])];
  await Promise.all(paths.map(async (path) => {
    const response = await fetchForPrecache(path);
    await cache.put(path, response);
  }));
}

async function cacheResponse(request, response) {
  if (!response.ok || response.type !== 'basic') return response;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
  return response;
}

async function navigationResponse(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put('/', response.clone());
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreVary: true }))
      || (await cache.match('/', { ignoreVary: true }))
      || Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    return cacheResponse(request, response);
  } catch {
    return (await cache.match(request, { ignoreVary: true })) || Response.error();
  }
}

function safePushPayload(event) {
  let value = {};
  try {
    value = event.data?.json?.() ?? {};
  } catch {
    try {
      value = JSON.parse(event.data?.text?.() ?? '{}');
    } catch {
      value = {};
    }
  }

  const title = typeof value.title === 'string' && value.title.trim()
    ? value.title.trim().slice(0, 120)
    : 'Workout Game';
  const body = typeof value.body === 'string' && value.body.trim()
    ? value.body.trim().slice(0, 280)
    : 'You have a new Workout Game notification.';
  const path = typeof value.url === 'string' ? sameOriginPath(value.url) : null;
  const tag = typeof value.tag === 'string' && value.tag.length <= 240 ? value.tag : undefined;
  return { title, body, path: path || '/', tag };
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precacheShell();
    // First install can activate immediately. Updates wait until the user opts in.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('push', (event) => {
  const payload = safePushPayload(event);
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
    data: { url: payload.path },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = sameOriginPath(event.notification.data?.url) || '/';
  const destination = new URL(path, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('navigate' in client) await client.navigate(destination);
        await client.focus();
        return;
      } catch {
        // Try another existing same-origin client before opening a new one.
      }
    }
    await self.clients.openWindow(destination);
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  const cacheableDestination = ['script', 'style', 'image', 'font', 'manifest'].includes(request.destination);
  const cacheablePath = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === ASSET_MANIFEST;

  if (cacheableDestination || cacheablePath) {
    event.respondWith(staticResponse(request));
  }
});
