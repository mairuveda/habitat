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

export class RuntimeConfigurationError extends Error {
  constructor(public readonly service: "runtime" | "supabase" | "cloudinary") {
    super(`Runtime configuration unavailable: ${service}`);
    this.name = "RuntimeConfigurationError";
  }
}

let configPromise: Promise<PublicRuntimeConfig> | null = null;

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePublicConfig(value: unknown): PublicRuntimeConfig {
  if (!value || typeof value !== "object") {
    throw new RuntimeConfigurationError("runtime");
  }

  const raw = value as {
    supabase?: { url?: unknown; publishableKey?: unknown };
    cloudinary?: { cloudName?: unknown; apiKey?: unknown; uploadPreset?: unknown };
  };

  return {
    supabase: {
      url: nullableString(raw.supabase?.url),
      publishableKey: nullableString(raw.supabase?.publishableKey)
    },
    cloudinary: {
      cloudName: nullableString(raw.cloudinary?.cloudName),
      apiKey: nullableString(raw.cloudinary?.apiKey),
      uploadPreset: nullableString(raw.cloudinary?.uploadPreset)
    }
  };
}

export async function getRuntimeConfig(): Promise<PublicRuntimeConfig> {
  if (!configPromise) {
    configPromise = fetch("/api/config", {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" }
    }).then(async (response) => {
      if (!response.ok) throw new RuntimeConfigurationError("runtime");
      return parsePublicConfig(await response.json());
    }).catch((error) => {
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}

export function requireSupabaseConfig(config: PublicRuntimeConfig) {
  const { url, publishableKey } = config.supabase;
  if (!url || !publishableKey) throw new RuntimeConfigurationError("supabase");
  return { url, publishableKey };
}

export function requireCloudinaryConfig(config: PublicRuntimeConfig) {
  const { cloudName, apiKey, uploadPreset } = config.cloudinary;
  if (!cloudName || !apiKey || !uploadPreset) {
    throw new RuntimeConfigurationError("cloudinary");
  }
  return { cloudName, apiKey, uploadPreset };
}
