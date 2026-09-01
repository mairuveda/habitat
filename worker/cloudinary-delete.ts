export type CloudinaryDeliveryType = "upload" | "private" | "authenticated";

type SignableValue = string | number | boolean | null | undefined;

export function normalizeCloudinaryDeliveryType(
  value: string | null | undefined
): CloudinaryDeliveryType {
  if (value === "private" || value === "authenticated") return value;
  return "upload";
}

export function cloudinaryDestroyParams(
  publicId: string,
  deliveryType: string | null | undefined,
  timestamp: number
) {
  return {
    public_id: publicId,
    timestamp,
    type: normalizeCloudinaryDeliveryType(deliveryType),
    invalidate: true
  };
}

export function cloudinarySignaturePayload(
  params: Record<string, SignableValue>
): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).replace(/&/g, "%26")}`)
    .join("&");
}

export function cloudinaryDestroySucceeded(result: unknown): boolean {
  return result === "ok" || result === "not found" || result === "not_found";
}
