export interface RuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;

  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
  CLOUDINARY_API_SECRET?: string;
}

export type PublicRuntimeConfig = {
  supabase: {
    url: string | null;
    publishableKey: string | null;
  };
  cloudinary: {
    cloudName: string | null;
    apiKey: string | null;
    uploadPreset: string | null;
  };
};

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

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getSupabaseUrl(env: RuntimeEnv): string | null {
  return clean(env.SUPABASE_URL);
}

export function getPublishableKey(env: RuntimeEnv): string | null {
  return clean(env.SUPABASE_PUBLISHABLE_KEY);
}

export function getAdminKey(env: RuntimeEnv): string | null {
  return clean(env.SUPABASE_SECRET_KEY);
}

export function getCloudName(env: RuntimeEnv): string | null {
  return clean(env.CLOUDINARY_CLOUD_NAME);
}

export function getCloudinaryApiKey(env: RuntimeEnv): string | null {
  return clean(env.CLOUDINARY_API_KEY);
}

export function getCloudinaryPreset(env: RuntimeEnv): string | null {
  return clean(env.CLOUDINARY_UPLOAD_PRESET);
}

export function publicRuntimeConfig(env: RuntimeEnv): PublicRuntimeConfig {
  return {
    supabase: {
      url: getSupabaseUrl(env),
      publishableKey: getPublishableKey(env)
    },
    cloudinary: {
      cloudName: getCloudName(env),
      apiKey: getCloudinaryApiKey(env),
      uploadPreset: getCloudinaryPreset(env)
    }
  };
}

export function runtimeReadiness(env: RuntimeEnv): RuntimeReadiness {
  const config = publicRuntimeConfig(env);
  const adminKey = getAdminKey(env);
  const cloudinarySecret = clean(env.CLOUDINARY_API_SECRET);

  const missing: string[] = [];

  if (!config.supabase.url) missing.push("SUPABASE_URL");
  if (!config.supabase.publishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (!adminKey) missing.push("SUPABASE_SECRET_KEY");
  if (!config.cloudinary.cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!config.cloudinary.apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!config.cloudinary.uploadPreset) missing.push("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudinarySecret) missing.push("CLOUDINARY_API_SECRET");

  const auth = Boolean(
    config.supabase.url
    && config.supabase.publishableKey
  );

  const admin = Boolean(auth && adminKey);

  const videoPlayback = Boolean(
    auth
    && config.cloudinary.cloudName
    && cloudinarySecret
  );

  const videoUpload = Boolean(
    admin
    && config.cloudinary.cloudName
    && config.cloudinary.apiKey
    && config.cloudinary.uploadPreset
    && cloudinarySecret
  );

  const videoDelete = Boolean(
    admin
    && config.cloudinary.cloudName
    && config.cloudinary.apiKey
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
