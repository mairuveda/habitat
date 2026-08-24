export type VideoAsset = {
  provider: "cloudinary" | "r2" | "stream";
  reference: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
};

export interface VideoProvider {
  upload(file: File): Promise<VideoAsset>;
  getPlaybackUrl(reference: string): Promise<string>;
  delete(reference: string): Promise<void>;
}
