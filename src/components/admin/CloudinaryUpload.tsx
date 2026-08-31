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

  const configurationError = !cloudName || !apiKey || !uploadPreset
    ? "La carga de videos no está configurada. Revisá las variables públicas de Cloudinary en Cloudflare."
    : null;

  useEffect(() => {
    if (configurationError) {
      setMessage(configurationError);
      return;
    }

    const markReady = () => {
      if (window.cloudinary) {
        setReady(true);
        setMessage(null);
      } else {
        setReady(false);
        setMessage("No pudimos iniciar el selector de videos.");
      }
    };

    const markFailed = () => {
      setReady(false);
      setMessage("No pudimos cargar el selector de videos. Revisá la conexión o bloqueadores del navegador.");
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-habitat-cloudinary="true"]');
    if (existing) {
      if (window.cloudinary) markReady();
      else {
        existing.addEventListener("load", markReady, { once: true });
        existing.addEventListener("error", markFailed, { once: true });
      }

      return () => {
        existing.removeEventListener("load", markReady);
        existing.removeEventListener("error", markFailed);
        widgetRef.current?.destroy();
      };
    }

    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    script.dataset.habitatCloudinary = "true";
    script.onload = markReady;
    script.onerror = markFailed;
    document.body.appendChild(script);

    return () => {
      widgetRef.current?.destroy();
    };
  }, [configurationError]);

  async function getToken(): Promise<string> {
    if (!supabase) throw new Error("El servicio de autenticación no está disponible.");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      window.location.replace("/alumnos?reason=expired");
      throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
    }
    return token;
  }

  async function openWidget() {
    setMessage(null);

    if (configurationError) {
      setMessage(configurationError);
      return;
    }

    if (!ready || !window.cloudinary || !cloudName || !apiKey || !uploadPreset) {
      setMessage("El selector de videos todavía se está preparando. Intentá nuevamente en unos segundos.");
      return;
    }

    try {
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
            try {
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

              if (response.status === 401) {
                window.location.replace("/alumnos?reason=expired");
                throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
              }

              if (!response.ok || !payload.signature) {
                throw new Error(
                  response.status === 503
                    ? "La firma de videos no está configurada en Cloudflare."
                    : payload.error ?? "No se pudo autorizar la carga."
                );
              }

              callback(payload.signature);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "No se pudo autorizar la carga.");
              throw error;
            }
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
            setMessage("El video se cargó, pero no quedó privado. Revisá que el preset de Cloudinary use delivery type 'authenticated'.");
            onUploaded(normalized);
            return;
          }

          setMessage("Video privado cargado correctamente.");
          onUploaded(normalized);
        });
      }

      widgetRef.current.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos abrir el selector de videos.");
    }
  }

  const disabled = Boolean(configurationError) || !ready;

  return (
    <div className="upload-box">
      <button
        type="button"
        className="upload-target"
        onClick={() => void openWidget()}
        disabled={disabled}
        aria-busy={!ready && !configurationError}
      >
        <span className="upload-icon">↑</span>
        <strong>{configurationError ? "Video no configurado" : ready ? "Subir video" : "Preparando carga…"}</strong>
        <span>Equipo o Google Drive</span>
        <small>MP4 · demo Free: hasta 100 MB</small>
      </button>
      {message && <p className="upload-message" role="status">{message}</p>}
    </div>
  );
}
