import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type UploadResult = {
  public_id: string;
  secure_url: string;
  duration?: number;
  thumbnail_url?: string;
};

type Props = { onUploaded: (result: UploadResult) => void };

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (options: Record<string, unknown>, callback: (error: unknown, result: { event: string; info: UploadResult }) => void) => { open: () => void; destroy: () => void };
    };
  }
}

export default function CloudinaryUpload({ onUploaded }: Props) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const widgetRef = useRef<{ open: () => void; destroy: () => void } | null>(null);

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.PUBLIC_CLOUDINARY_API_KEY;

  useEffect(() => {
    if (!cloudName || !apiKey) return;

    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => {
      widgetRef.current?.destroy();
      script.remove();
    };
  }, [cloudName, apiKey]);

  async function openWidget() {
    if (!ready || !window.cloudinary || !cloudName || !apiKey) {
      setMessage("Conectá Cloudinary para habilitar la carga real de videos.");
      return;
    }

    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget({
        cloudName,
        apiKey,
        resourceType: "video",
        sources: ["local", "google_drive", "url", "camera"],
        multiple: false,
        maxFileSize: 100_000_000,
        clientAllowedFormats: ["mp4", "mov", "webm"],
        folder: "habitat/classes",
        showAdvancedOptions: false,
        uploadSignature: async (callback: (signature: string) => void, paramsToSign: Record<string, unknown>) => {
          const token = (await supabase?.auth.getSession()).data.session?.access_token;
          const response = await fetch("/api/cloudinary/sign", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ paramsToSign })
          });
          if (!response.ok) throw new Error("No se pudo autorizar la carga.");
          const data = await response.json() as { signature: string };
          callback(data.signature);
        }
      }, (error, result) => {
        if (error) {
          setMessage("La carga no pudo completarse.");
          return;
        }
        if (result.event === "success") {
          setMessage("Video cargado correctamente.");
          onUploaded(result.info);
        }
      });
    }

    widgetRef.current.open();
  }

  return (
    <div className="upload-box">
      <button type="button" className="upload-target" onClick={openWidget}>
        <span className="upload-icon">↑</span>
        <strong>Arrastrá y subí tu video</strong>
        <span>o elegí desde tu equipo / Google Drive</span>
        <small>MP4, MOV o WebM · demo: hasta 100 MB</small>
      </button>
      {message && <p className="upload-message">{message}</p>}
    </div>
  );
}
