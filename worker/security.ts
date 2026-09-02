export type JsonReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413 | 415; error: string };

const MAX_JSON_BYTES = 32 * 1024;

type SecurityEnv = { SUPABASE_URL?: string };

function isLocalHostname(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function websocketOrigin(origin: string): string {
  return origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function contentSecurityPolicy(env: SecurityEnv): string {
  const connect = ["'self'", "https://api.cloudinary.com", "https://res.cloudinary.com"];
  const supabaseUrl = env.SUPABASE_URL?.trim() || null;

  if (supabaseUrl) {
    try {
      const origin = new URL(supabaseUrl).origin;
      connect.push(origin, websocketOrigin(origin));
    } catch {
      // Readiness already reports invalid/missing config. Keep a safe CSP.
    }
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://*.cloudinary.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com",
    "media-src 'self' blob: https://res.cloudinary.com",
    `connect-src ${connect.join(" ")} https://*.cloudinary.com https://www.googleapis.com https://accounts.google.com`,
    "frame-src 'self' https://*.cloudinary.com https://accounts.google.com https://drive.google.com",
    "worker-src 'self' blob:"
  ].join("; ");
}

export function secureResponse(
  response: Response,
  request: Request,
  env: SecurityEnv
): Response {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);

  headers.set("Content-Security-Policy", contentSecurityPolicy(env));
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  if (url.protocol === "https:" && !isLocalHostname(url.hostname)) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  headers.delete("server");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readJson<T>(
  request: Request,
  maxBytes = MAX_JSON_BYTES
): Promise<JsonReadResult<T>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      status: 415,
      error: "La solicitud debe usar application/json."
    };
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: "La solicitud es demasiado grande."
    };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: "La solicitud es demasiado grande."
    };
  }

  try {
    const parsed = JSON.parse(text) as T;
    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      status: 400,
      error: "El JSON de la solicitud no es válido."
    };
  }
}

export function securityEvent(
  request: Request,
  event: string,
  outcome: "allowed" | "denied" | "failed"
): void {
  const url = new URL(request.url);

  console.log(JSON.stringify({
    type: "security",
    event,
    outcome,
    method: request.method,
    path: url.pathname,
    ray: request.headers.get("cf-ray") ?? undefined
  }));
}
