import type { VideoAsset, VideoProvider } from "./types";

/**
 * Browser upload implementation reserved for the demo.
 * The actual admin UI uses Cloudinary's Upload Widget so it can import from
 * Google Drive. Signed uploads are handled by /api/cloudinary/sign.
 */
export class CloudinaryVideoProvider implements VideoProvider {
  constructor(private readonly cloudName: string) {}

  async upload(_file: File): Promise<VideoAsset> {
    throw new Error("Use CloudinaryUpload in the admin dashboard.");
  }

  async getPlaybackUrl(reference: string): Promise<string> {
    return `https://res.cloudinary.com/${this.cloudName}/video/upload/${reference}`;
  }

  async delete(_reference: string): Promise<void> {
    throw new Error("Delete operations must run server-side.");
  }
}
