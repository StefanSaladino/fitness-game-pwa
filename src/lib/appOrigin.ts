export const TOP_SET_PRODUCTION_ORIGIN = 'https://topset2026.netlify.app';

const TOP_SET_NETLIFY_PREVIEW_HOST = /^[a-z0-9-]+--topset2026\.netlify\.app$/i;
const LOCAL_DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_DEVELOPMENT_PORT = '5173';

function parseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isTopSetProductionOrigin(origin: string): boolean {
  const url = parseOrigin(origin);
  return Boolean(
    url
    && url.origin === TOP_SET_PRODUCTION_ORIGIN
    && url.pathname === '/'
    && !url.search
    && !url.hash,
  );
}

export function isTopSetNetlifyPreviewOrigin(origin: string): boolean {
  const url = parseOrigin(origin);
  return Boolean(
    url
    && url.protocol === 'https:'
    && !url.port
    && TOP_SET_NETLIFY_PREVIEW_HOST.test(url.hostname)
    && url.pathname === '/'
    && !url.search
    && !url.hash,
  );
}

export function isLocalDevelopmentOrigin(origin: string): boolean {
  const url = parseOrigin(origin);
  return Boolean(
    url
    && url.protocol === 'http:'
    && LOCAL_DEVELOPMENT_HOSTS.has(url.hostname)
    && url.port === LOCAL_DEVELOPMENT_PORT
    && url.pathname === '/'
    && !url.search
    && !url.hash,
  );
}

function allowedOrigin(origin: string, isDev: boolean): string | null {
  const parsed = parseOrigin(origin);
  if (!parsed) return null;

  const normalized = parsed.origin;
  const normalizedUrl = `${normalized}/`;

  if (isTopSetProductionOrigin(normalizedUrl) || isTopSetNetlifyPreviewOrigin(normalizedUrl)) {
    return normalized;
  }

  if (isDev && isLocalDevelopmentOrigin(normalizedUrl)) {
    return normalized;
  }

  return null;
}

export interface ResolveTopSetAppOriginInput {
  browserOrigin?: string | null;
  configuredOrigin?: string | null;
  isDev: boolean;
}

export function resolveTopSetAppOrigin({
  browserOrigin,
  configuredOrigin,
  isDev,
}: ResolveTopSetAppOriginInput): string {
  const browserValue = browserOrigin?.trim();
  if (browserValue) {
    const browserAllowed = allowedOrigin(browserValue, isDev);
    if (browserAllowed) return browserAllowed;
    throw new Error(`Top Set authentication is not allowed from browser origin: ${browserValue}`);
  }

  const configuredValue = configuredOrigin?.trim();
  if (configuredValue) {
    const configuredAllowed = allowedOrigin(configuredValue, isDev);
    if (configuredAllowed) return configuredAllowed;
    throw new Error(`Top Set authentication is not allowed from configured origin: ${configuredValue}`);
  }

  return TOP_SET_PRODUCTION_ORIGIN;
}
