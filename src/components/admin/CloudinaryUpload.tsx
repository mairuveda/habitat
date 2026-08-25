import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UploadResult = {
  public_id: string;
  secure_url: string;
  duration?: number;
  format?: string;
  version?: number;
  type?: "authenticated" | "upload" | "private";
  bytes?: number;
};

type Props = { onUploaded: (result: UploadResult) => void };

type UploadWidget = { open: () => void; destroy: () => void };
type UploadWidgetResult = { event: string; info: UploadResult };

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: UploadWidgetResult) => void
      ) => UploadWidget;
    };
  }
}

export default function CloudinaryUpload({ onUploaded }: Props) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const widgetRef = useRef<UploadWidget | null>(null);

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.PUBLIC_CLOUDINARY_API_KEY;
  const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    if (!cloudName || !apiKey) return;

    const existing = document.querySelector<HTMLScriptElement>('script[data-habitat-cloudinary="true"]');
    if (existing) {
      if (window.cloudinary) setReady(true);
      else existing.addEventListener("load", () => setReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    script.dataset.habitatCloudinary = "true";
    script.onload = () => setReady(true);
    document.body.appendChild(script);

    return () => {
      widgetRef.current?.destroy();
    };
  }, [cloudName, apiKey]);

  async function getToken(): Promise<string> {
    if (!supabase) throw new Error("Supabase no está configurado.");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("La sesión expiró.");
    return token;
  }

  async function openWidget() {
    setMessage(null);
    if (!ready || !window.cloudinary || !cloudName || !apiKey) {
      setMessage("Cloudinary todavía no está configurado.");
      return;
    }

    if (!uploadPreset) {
      setMessage("Falta PUBLIC_CLOUDINARY_UPLOAD_PRESET. Usá el preset firmado/authenticated de Hábitat.");
      return;
    }

    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget({
        cloudName,
        apiKey,
        uploadPreset,
        resourceType: "video",
        sources: ["local", "google_drive"],
        multiple: false,
        maxFileSize: 100_000_000,
        clientAllowedFormats: ["mp4"],
        assetFolder: "habitat/classes",
        showAdvancedOptions: false,
        singleUploadAutoClose: true,
        uploadSignature: async (
          callback: (signature: string) => void,
          paramsToSign: Record<string, string | number | boolean>
        ) => {
          const token = await getToken();
          const response = await fetch("/api/cloudinary/sign", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ paramsToSign })
          });
          const payload = await response.json().catch(() => ({})) as { signature?: string; error?: string };
          if (!response.ok || !payload.signature) throw new Error(payload.error ?? "No se pudo autorizar la carga.");
          callback(payload.signature);
        }
      }, (error, result) => {
        if (error) {
          setMessage("La carga no pudo completarse.");
          return;
        }
        if (result.event !== "success") return;

        const inferredType: UploadResult["type"] = result.info.type
          ?? (result.info.secure_url.includes("/video/authenticated/") ? "authenticated"
            : result.info.secure_url.includes("/video/private/") ? "private"
              : "upload");
        const normalized = { ...result.info, type: inferredType };

        if (inferredType !== "authenticated") {
          setMessage("El video se cargó, pero NO quedó privado. Revisá que el preset de Cloudinary use delivery type 'authenticated'.");
          onUploaded(normalized);
          return;
        }

        setMessage("Video privado cargado correctamente.");
        onUploaded(normalized);
      });
    }

    widgetRef.current.open();
  }

  return (
    <div className="upload-box">
      <button type="button" className="upload-target" onClick={() => void openWidget()}>
        <span className="upload-icon">↑</span>
        <strong>Subir video</strong>
        <span>Equipo o Google Drive</span>
        <small>MP4 · demo Free: hasta 100 MB</small>
      </button>
      {message && <p className="upload-message" role="status">{message}</p>}
    </div>
  );
}
