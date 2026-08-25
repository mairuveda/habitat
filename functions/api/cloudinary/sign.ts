interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  CLOUDINARY_API_SECRET: string;
}

type SignBody = { paramsToSign?: Record<string, string | number | boolean> };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      authorization,
      apikey: env.SUPABASE_PUBLISHABLE_KEY
    }
  });
  if (!userResponse.ok) return false;

  const user = await userResponse.json() as { id?: string };
  if (!user.id) return false;

  const profileResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`, {
    headers: {
      authorization,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      accept: "application/json"
    }
  });
  if (!profileResponse.ok) return false;

  const profiles = await profileResponse.json() as Array<{ role?: string }>;
  return profiles[0]?.role === "admin";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.CLOUDINARY_API_SECRET) {
    return json({ error: "Server configuration incomplete." }, 503);
  }

  if (!(await requireAdmin(request, env))) {
    return json({ error: "Unauthorized." }, 401);
  }

  const body = await request.json().catch(() => ({})) as SignBody;
  const params = body.paramsToSign;
  if (!params || typeof params !== "object") return json({ error: "Missing paramsToSign." }, 400);

  const folder = String(params.folder ?? "");
  if (folder && !folder.startsWith("habitat/")) return json({ error: "Invalid folder." }, 400);

  const signaturePayload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  const signature = await sha1Hex(`${signaturePayload}${env.CLOUDINARY_API_SECRET}`);
  return json({ signature });
};
