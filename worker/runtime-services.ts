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

export function runtimeServices(env: RuntimeEnv) {
  const supabaseUrl = getSupabaseUrl(env);
  const publishableKey = getPublishableKey(env);
  const adminKey = getAdminKey(env);
  const cloudName = getCloudName(env);
  const uploadPreset = getCloudinaryPreset(env);

  return {
    auth: Boolean(supabaseUrl && publishableKey),
    admin: Boolean(supabaseUrl && publishableKey && adminKey),
    video: Boolean(cloudName && uploadPreset && env.CLOUDINARY_API_SECRET)
  };
}
