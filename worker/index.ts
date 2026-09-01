import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminKey,
  getCloudinaryApiKey,
  getCloudinaryPreset,
  getCloudName,
  getPublishableKey,
  getSupabaseUrl,
  runtimeServices,
  type RuntimeEnv
} from "./runtime-services";
import {
  cloudinaryDestroyParams,
  cloudinaryDestroySucceeded,
  cloudinarySignaturePayload
} from "./cloudinary-delete";

interface Env extends RuntimeEnv {
  ASSETS: Fetcher;
}

type AuthContext = {
  userId: string;
  token: string;
  userClient: SupabaseClient;
};

type AdminContext = AuthContext & {
  admin: SupabaseClient;
};

type CreateStudentBody = {
  email?: string;
  fullName?: string;
  password?: string;
  groupId?: string | null;
};

type SignBody = {
  paramsToSign?: Record<string, string | number | boolean>;
};

type PlaybackRow = {
  video_provider: string;
  video_ref: string;
  video_delivery_type: "authenticated" | "upload" | "private" | null;
  video_format: string | null;
  video_version: number | null;
  published: boolean;
};

type DeleteClassRow = {
  id: string;
  published: boolean;
  video_provider: string;
  video_ref: string;
  video_delivery_type: "authenticated" | "upload" | "private" | null;
};

type CloudinaryDestroyResponse = {
  result?: string;
  error?: { message?: string };
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

function createServerClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

async function requireAuthenticated(request: Request, env: Env): Promise<AuthContext | Response> {
  const supabaseUrl = getSupabaseUrl(env);
  const publishableKey = getPublishableKey(env);
  if (!supabaseUrl || !publishableKey) return json({ error: "El servicio de autenticación no está disponible." }, 503);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "No autorizado." }, 401);
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return json({ error: "No autorizado." }, 401);

  const authClient = createServerClient(supabaseUrl, publishableKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sesión inválida." }, 401);

  const userClient = createClient(supabaseUrl, publishableKey, {
    accessToken: async () => token,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return { userId: authData.user.id, token, userClient };
}

async function requireAdmin(request: Request, env: Env): Promise<AdminContext | Response> {
  const auth = await requireAuthenticated(request, env);
  if (auth instanceof Response) return auth;

  const supabaseUrl = getSupabaseUrl(env);
  const secretKey = getAdminKey(env);
  if (!supabaseUrl || !secretKey) return json({ error: "La administración de usuarios no está disponible." }, 503);

  const admin = createServerClient(supabaseUrl, secretKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,active")
    .eq("id", auth.userId)
    .single();

  if (profileError || profile?.role !== "admin" || profile.active !== true) {
    return json({ error: "Se requiere rol de administradora." }, 403);
  }

  return { ...auth, admin };
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "!7";
}

async function createStudent(request: Request, env: Env): Promise<Response> {
  const context = await requireAdmin(request, env);
  if (context instanceof Response) return context;

  const body = await request.json().catch(() => ({})) as CreateStudentBody;
  const email = body.email?.trim().toLowerCase() ?? "";
  const fullName = body.fullName?.trim() ?? "";
  const suppliedPassword = body.password?.trim();
  const password = suppliedPassword || randomPassword();
  const groupId = body.groupId?.trim() || null;

  if (!email || !email.includes("@")) return json({ error: "Ingresá un email válido." }, 400);
  if (!fullName) return json({ error: "Ingresá el nombre de la alumna." }, 400);
  if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);

  if (groupId) {
    const { data: group, error: groupError } = await context.admin
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .eq("active", true)
      .maybeSingle();
    if (groupError || !group) return json({ error: "El grupo seleccionado no existe o está inactivo." }, 400);
  }

  const { data: created, error: createError } = await context.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "Ya existe una cuenta con ese email."
      : "No pudimos crear la cuenta de la alumna.";
    return json({ error: message }, 400);
  }

  if (groupId) {
    const { error: memberError } = await context.admin
      .from("group_members")
      .insert({ profile_id: created.user.id, group_id: groupId });

    if (memberError) {
      await context.admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "No pudimos asignar el grupo; la cuenta no fue creada." }, 500);
    }
  }

  return json({ id: created.user.id, temporaryPassword: suppliedPassword ? undefined : password }, 201);
}

async function sha1Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

async function sha1Hex(value: string): Promise<string> {
  const bytes = await sha1Bytes(value);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signCloudinaryUpload(request: Request, env: Env): Promise<Response> {
  const context = await requireAdmin(request, env);
  if (context instanceof Response) return context;

  const uploadPreset = getCloudinaryPreset(env);
  if (!env.CLOUDINARY_API_SECRET || !uploadPreset) return json({ error: "La carga de videos no está disponible." }, 503);

  const body = await request.json().catch(() => ({})) as SignBody;
  const params = body.paramsToSign;
  if (!params || typeof params !== "object") return json({ error: "Faltan parámetros de firma." }, 400);

  const folder = String(params.asset_folder ?? params.folder ?? "");
  if (folder && folder !== "habitat/classes") return json({ error: "Carpeta de carga inválida." }, 400);

  const preset = String(params.upload_preset ?? "");
  if (preset !== uploadPreset) return json({ error: "Upload preset inválido." }, 400);

  const timestamp = Number(params.timestamp ?? 0);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 3600) {
    return json({ error: "Timestamp de carga inválido." }, 400);
  }

  const signaturePayload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  const signature = await sha1Hex(`${signaturePayload}${env.CLOUDINARY_API_SECRET}`);
  return json({ signature });
}

async function destroyCloudinaryVideo(
  env: Env,
  row: DeleteClassRow
): Promise<"deleted" | "missing"> {
  const cloudName = getCloudName(env);
  const apiKey = getCloudinaryApiKey(env);
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary delete runtime incompleto.");
  }

  const params = cloudinaryDestroyParams(
    row.video_ref,
    row.video_delivery_type,
    Math.floor(Date.now() / 1000)
  );
  const signature = await sha1Hex(`${cloudinarySignaturePayload(params)}${apiSecret}`);

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value));
  }
  body.set("api_key", apiKey);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }
  );

  const payload = await response.json().catch(() => ({})) as CloudinaryDestroyResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Cloudinary rechazó la eliminación.");
  }

  if (!cloudinaryDestroySucceeded(payload.result)) {
    throw new Error("Cloudinary no confirmó la eliminación del video.");
  }

  return payload.result === "ok" ? "deleted" : "missing";
}

async function deleteAdminClass(
  request: Request,
  env: Env,
  classId: string
): Promise<Response> {
  const context = await requireAdmin(request, env);
  if (context instanceof Response) return context;

  const cloudName = getCloudName(env);
  const apiKey = getCloudinaryApiKey(env);
  if (!cloudName || !apiKey || !env.CLOUDINARY_API_SECRET) {
    return json({ error: "La eliminación de videos no está configurada en el Worker." }, 503);
  }

  const { data, error } = await context.admin
    .from("classes")
    .select("id,published,video_provider,video_ref,video_delivery_type")
    .eq("id", classId)
    .maybeSingle();

  if (error) return json({ error: "No pudimos leer la clase antes de eliminarla." }, 500);
  if (!data) return json({ error: "La clase ya no existe." }, 404);

  const row = data as DeleteClassRow;
  if (row.video_provider !== "cloudinary") {
    return json(
      { error: "La eliminación coordinada sólo soporta videos de Cloudinary en esta versión." },
      422
    );
  }

  const wasPublished = row.published === true;
  const { error: pauseError } = await context.admin
    .from("classes")
    .update({ published: false })
    .eq("id", classId);

  if (pauseError) {
    return json({ error: "No pudimos asegurar la clase antes de eliminarla." }, 500);
  }

  let video: "deleted" | "missing";
  try {
    video = await destroyCloudinaryVideo(env, row);
  } catch {
    if (wasPublished) {
      const { error: restoreError } = await context.admin
        .from("classes")
        .update({ published: true })
        .eq("id", classId);

      if (restoreError) {
        return json(
          {
            error: "No pudimos eliminar el video y la clase quedó pausada. Revisá la configuración de Cloudinary.",
            cleanupRequired: true
          },
          502
        );
      }
    }

    return json(
      { error: "No pudimos eliminar el video de Cloudinary. La clase no fue eliminada." },
      502
    );
  }

  const { error: deleteError } = await context.admin
    .from("classes")
    .delete()
    .eq("id", classId);

  if (deleteError) {
    return json(
      {
        error: "El video se eliminó de Cloudinary, pero no pudimos eliminar la clase. Quedó pausada; reintentá.",
        cleanupRequired: true
      },
      500
    );
  }

  return json({
    ok: true,
    deleted: {
      class: true,
      video
    }
  });
}

async function signedDeliveryUrl(env: Env, row: PlaybackRow): Promise<string> {
  const cloudName = getCloudName(env);
  if (!cloudName || !env.CLOUDINARY_API_SECRET) throw new Error("Cloudinary runtime incompleto.");

  const format = row.video_format || "mp4";
  const versionPart = row.video_version ? `v${row.video_version}/` : "";
  const assetPath = `${versionPart}${row.video_ref}.${format}`;
  const encodedPublicId = row.video_ref.split("/").map(encodeURIComponent).join("/");
  const encodedPath = `${versionPart}${encodedPublicId}.${encodeURIComponent(format)}`;
  const deliveryType = row.video_delivery_type || "upload";

  if (deliveryType === "upload") {
    return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/${encodedPath}`;
  }

  const digest = await sha1Bytes(`${assetPath}${env.CLOUDINARY_API_SECRET}`);
  const signature = base64Url(digest).slice(0, 8);
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/${deliveryType}/s--${signature}--/${encodedPath}`;
}

async function playback(request: Request, env: Env, classId: string): Promise<Response> {
  const context = await requireAuthenticated(request, env);
  if (context instanceof Response) return context;

  const cloudName = getCloudName(env);
  if (!cloudName || !env.CLOUDINARY_API_SECRET) return json({ error: "El servicio de video no está disponible." }, 503);

  const { data, error } = await context.userClient
    .from("classes")
    .select("video_provider,video_ref,video_delivery_type,video_format,video_version,published")
    .eq("id", classId)
    .single();

  if (error || !data) return json({ error: "Clase no disponible para esta cuenta." }, 404);
  const row = data as PlaybackRow;
  if (!row.published) return json({ error: "Clase no publicada." }, 404);
  if (row.video_provider !== "cloudinary") return json({ error: "Proveedor de video no soportado en esta versión." }, 422);

  try {
    const url = await signedDeliveryUrl(env, row);
    return json({ url });
  } catch {
    return json({ error: "No pudimos generar la reproducción." }, 500);
  }
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, version: "0.4.1", services: runtimeServices(env) });
  }
  if (url.pathname === "/api/admin/students" && request.method === "POST") return createStudent(request, env);
  if (url.pathname === "/api/cloudinary/sign" && request.method === "POST") return signCloudinaryUpload(request, env);

  const adminClassMatch = url.pathname.match(/^\/api\/admin\/classes\/([0-9a-f-]{36})$/i);
  if (adminClassMatch && request.method === "DELETE") {
    return deleteAdminClass(request, env, adminClassMatch[1]);
  }

  const match = url.pathname.match(/^\/api\/classes\/([0-9a-f-]{36})\/playback$/i);
  if (match && request.method === "GET") return playback(request, env, match[1]);

  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
