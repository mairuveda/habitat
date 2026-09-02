import { useEffect, useRef, useState } from "react";
import {
  getRuntimeConfig,
  requireCloudinaryConfig
} from "@/lib/runtime-config";
import { getSupabase } from "@/lib/supabase";

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

type UploadWidget = {
  open: () => void;
  destroy: () => void;
};

type UploadWidgetResult = {
  event: string;
  info: UploadResult;
};

type CloudinaryConfig = ReturnType<typeof requireCloudinaryConfig>;

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

function loadCloudinaryWidget(
  onReady: () => void,
  onFailed: () => void
): () => void {
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-habitat-cloudinary="true"]'
  );

  if (existing) {
    if (window.cloudinary) {
      onReady();
      return () => undefined;
    }

    existing.addEventListener("load", onReady, { once: true });
    existing.addEventListener("error", onFailed, { once: true });

    return () => {
      existing.removeEventListener("load", onReady);
      existing.removeEventListener("error", onFailed);
    };
  }

  const script = document.createElement("script");
  script.src = "https://upload-widget.cloudinary.com/global/all.js";
  script.async = true;
  script.dataset.habitatCloudinary = "true";
  script.onload = onReady;
  script.onerror = onFailed;
  document.body.appendChild(script);

  return () => {
    script.onload = null;
    script.onerror = null;
  };
}

export default function CloudinaryUpload({ onUploaded }: Props) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<CloudinaryConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const widgetRef = useRef<UploadWidget | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanupScript: () => void = () => {};

    async function prepare() {
      try {
        const runtime = await getRuntimeConfig();
        const cloudinaryConfig = requireCloudinaryConfig(runtime);

        if (cancelled) return;
        setConfig(cloudinaryConfig);

        cleanupScript = loadCloudinaryWidget(
          () => {
            if (cancelled) return;

            if (window.cloudinary) {
              setReady(true);
              setMessage(null);
            } else {
              setReady(false);
              setMessage("No pudimos iniciar el selector de videos.");
            }
          },
          () => {
            if (cancelled) return;
            setReady(false);
            setMessage("No pudimos cargar el selector de videos.");
          }
        );
      } catch {
        if (!cancelled) {
          setReady(false);
          setConfig(null);
          setMessage("La carga de videos no está configurada.");
        }
      }
    }

    void prepare();

    return () => {
      cancelled = true;
      cleanupScript();
      widgetRef.current?.destroy();
    };
  }, []);

  async function getToken(): Promise<string> {
    const supabase = await getSupabase();
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

    if (!ready || !window.cloudinary || !config) {
      setMessage("El selector de videos todavía se está preparando.");
      return;
    }

    try {
      if (!widgetRef.current) {
        const { cloudName, apiKey, uploadPreset } = config;

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

              const payload = await response.json().catch(() => ({})) as {
                signature?: string;
                error?: string;
              };

              if (response.status === 401) {
                window.location.replace("/alumnos?reason=expired");
                throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
              }

              if (!response.ok || !payload.signature) {
                throw new Error(
                  response.status === 503
                    ? "La carga de videos no está disponible."
                    : payload.error ?? "No se pudo autorizar la carga."
                );
              }

              callback(payload.signature);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "No se pudo autorizar la carga."
              );
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
            ?? (result.info.secure_url.includes("/video/authenticated/")
              ? "authenticated"
              : result.info.secure_url.includes("/video/private/")
                ? "private"
                : "upload");

          const normalized = {
            ...result.info,
            type: inferredType
          };

          if (inferredType !== "authenticated") {
            setMessage(
              "El video se cargó, pero no quedó privado. No será posible publicarlo."
            );
            onUploaded(normalized);
            return;
          }

          setMessage("Video privado cargado correctamente.");
          onUploaded(normalized);
        });
      }

      widgetRef.current.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos abrir el selector de videos."
      );
    }
  }

  return (
    <div className="upload-box">
      <button
        type="button"
        className="upload-target"
        onClick={() => void openWidget()}
        disabled={!ready || !config}
        aria-busy={!ready}
      >
        <span className="upload-icon">↑</span>
        <strong>{ready ? "Subir video" : "Preparando carga…"}</strong>
        <span>Equipo o Google Drive</span>
        <small>MP4 · hasta 100 MB</small>
      </button>

      {message && <p className="upload-message" role="status">{message}</p>}
    </div>
  );
}
