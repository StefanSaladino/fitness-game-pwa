import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PRODUCTION_ORIGIN = "https://topset2026.netlify.app";
const CONFIRM_PATH = "/confirm-signup";
const NETLIFY_PREVIEW_HOST = /^[a-z0-9-]+--topset2026\.netlify\.app$/i;
const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1"]);

const baseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function validTokenHash(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,512}$/.test(value);
}

function productionTarget(): URL {
  return new URL(CONFIRM_PATH, PRODUCTION_ORIGIN);
}

function validConfirmationTarget(value: string | null): URL | null {
  if (!value) return null;

  try {
    const candidate = new URL(value);

    if (candidate.username || candidate.password || candidate.search || candidate.hash) return null;
    if (candidate.pathname !== CONFIRM_PATH) return null;

    if (candidate.origin === PRODUCTION_ORIGIN) return candidate;

    const isPreview = candidate.protocol === "https:"
      && !candidate.port
      && NETLIFY_PREVIEW_HOST.test(candidate.hostname);
    if (isPreview) return candidate;

    const isLocalDevelopment = candidate.protocol === "http:"
      && candidate.port === "5173"
      && LOCAL_DEVELOPMENT_HOSTS.has(candidate.hostname);
    if (isLocalDevelopment) return candidate;
  } catch {
    // Invalid redirect targets fall back to production below.
  }

  return null;
}

function confirmationTarget(redirectTo: string | null): URL {
  return validConfirmationTarget(redirectTo) ?? productionTarget();
}

function redirectToApp(requestUrl: URL, tokenHash?: string): Response {
  const target = confirmationTarget(requestUrl.searchParams.get("redirect_to"));
  if (tokenHash) {
    target.searchParams.set("token_hash", tokenHash);
    target.searchParams.set("type", "email");
  }

  return new Response(null, {
    status: 303,
    headers: {
      ...baseHeaders,
      "Location": target.toString(),
    },
  });
}

Deno.serve((req: Request) => {
  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers: baseHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const tokenHash = url.searchParams.get("token_hash")?.trim() ?? "";

    // Never consume the one-time token here. Email scanners and link previews
    // can issue GET/HEAD requests automatically. Verification only happens
    // after the user presses Confirm email inside the Top Set application.
    if (!validTokenHash(tokenHash)) return redirectToApp(url);
    return redirectToApp(url, tokenHash);
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: {
      ...baseHeaders,
      "Allow": "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
});
