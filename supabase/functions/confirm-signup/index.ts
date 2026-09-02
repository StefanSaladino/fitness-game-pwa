import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PRODUCTION_ORIGIN = "https://topset2026.netlify.app";
const CONFIRM_PATH = "/confirm-signup";

const baseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function validTokenHash(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,512}$/.test(value);
}

function allowedRedirectOrigin(origin: string): boolean {
  if (origin === PRODUCTION_ORIGIN || origin === "http://localhost:5173") return true;

  try {
    const url = new URL(origin);
    return url.protocol === "https:"
      && /^[a-z0-9-]+--topset2026\.netlify\.app$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function confirmationTarget(redirectTo: string | null): URL {
  if (redirectTo) {
    try {
      const candidate = new URL(redirectTo);
      if (allowedRedirectOrigin(candidate.origin)) {
        candidate.pathname = CONFIRM_PATH;
        candidate.search = "";
        candidate.hash = "";
        return candidate;
      }
    } catch {
      // Fall through to the production origin for malformed input.
    }
  }

  return new URL(CONFIRM_PATH, PRODUCTION_ORIGIN);
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
