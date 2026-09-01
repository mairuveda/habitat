export type VideoUploadBrowserConfig = {
  cloudName?: string;
  apiKey?: string;
  uploadPreset?: string;
};

export type VideoUploadConfiguration = {
  configured: boolean;
  missing: string[];
};

const REQUIRED_VIDEO_UPLOAD_VARS = [
  ["PUBLIC_CLOUDINARY_CLOUD_NAME", "cloudName"],
  ["PUBLIC_CLOUDINARY_API_KEY", "apiKey"],
  ["PUBLIC_CLOUDINARY_UPLOAD_PRESET", "uploadPreset"]
] as const;

export function getVideoUploadConfiguration(
  config: VideoUploadBrowserConfig
): VideoUploadConfiguration {
  const missing = REQUIRED_VIDEO_UPLOAD_VARS
    .filter(([, key]) => !config[key])
    .map(([envName]) => envName);

  return {
    configured: missing.length === 0,
    missing
  };
}
