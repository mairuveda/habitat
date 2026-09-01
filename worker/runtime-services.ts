export interface RuntimeEnv {
  SUPABASE_URL?: string;
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  PUBLIC_CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
  PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
}

export type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  videoUpload: boolean;
  videoPlayback: boolean;
  videoDelete: boolean;
};

export type RuntimeReadiness = {
  ready: boolean;
  services: RuntimeServices;
  missing: string[];
};

export function getSupabaseUrl(env: RuntimeEnv): string | null {
  return env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL ?? null;
}

export function getPublishableKey(env: RuntimeEnv): string | null {
  return env.SUPABASE_PUBLISHABLE_KEY
    ?? env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? env.SUPABASE_ANON_KEY
    ?? env.PUBLIC_SUPABASE_ANON_KEY
    ?? null;
}

export function getAdminKey(env: RuntimeEnv): string | null {
  return env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function getCloudName(env: RuntimeEnv): string | null {
  return env.CLOUDINARY_CLOUD_NAME ?? env.PUBLIC_CLOUDINARY_CLOUD_NAME ?? null;
}

export function getCloudinaryApiKey(env: RuntimeEnv): string | null {
  return env.CLOUDINARY_API_KEY ?? env.PUBLIC_CLOUDINARY_API_KEY ?? null;
}

export function getCloudinaryPreset(env: RuntimeEnv): string | null {
  return env.CLOUDINARY_UPLOAD_PRESET ?? env.PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? null;
}

export function runtimeReadiness(env: RuntimeEnv): RuntimeReadiness {
  const supabaseUrl = getSupabaseUrl(env);
  const publishableKey = getPublishableKey(env);
  const adminKey = getAdminKey(env);
  const cloudName = getCloudName(env);
  const cloudinaryApiKey = getCloudinaryApiKey(env);
  const cloudinaryPreset = getCloudinaryPreset(env);
  const cloudinarySecret = env.CLOUDINARY_API_SECRET ?? null;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!publishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (!adminKey) missing.push("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!cloudinaryApiKey) missing.push("CLOUDINARY_API_KEY");
  if (!cloudinaryPreset) missing.push("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudinarySecret) missing.push("CLOUDINARY_API_SECRET");

  const auth = Boolean(supabaseUrl && publishableKey);
  const admin = Boolean(auth && adminKey);
  const videoPlayback = Boolean(auth && cloudName && cloudinarySecret);
  const videoUpload = Boolean(
    admin
    && cloudName
    && cloudinaryApiKey
    && cloudinaryPreset
    && cloudinarySecret
  );
  const videoDelete = Boolean(
    admin
    && cloudName
    && cloudinaryApiKey
    && cloudinarySecret
  );

  const services = {
    auth,
    admin,
    videoUpload,
    videoPlayback,
    videoDelete
  };

  return {
    ready: Object.values(services).every(Boolean),
    services,
    missing
  };
}

export function runtimeServices(env: RuntimeEnv): RuntimeServices {
  return runtimeReadiness(env).services;
}
