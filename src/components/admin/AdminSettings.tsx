import { useEffect, useMemo, useState } from "react";
import { getVideoUploadConfiguration } from "@/lib/browser-config";
import { isSupabaseConfigured } from "@/lib/supabase";

type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  video: boolean;
};

type RuntimeState =
  | { status: "loading"; services: null; message: null }
  | { status: "ready"; services: RuntimeServices; message: null }
  | { status: "unavailable"; services: null; message: string };

function ServiceRow({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  return (
    <div className="service-row">
      <span className={ok === true ? "service-dot ok" : ok === false ? "service-dot error" : "service-dot"} aria-hidden="true" />
      <div><strong>{label}</strong><small>{detail}</small></div>
      <span className={ok === true ? "status-pill active" : "status-pill"}>{ok === null ? "Sin verificar" : ok ? "OK" : "Pendiente"}</span>
    </div>
  );
}

export default function AdminSettings() {
  const [runtime, setRuntime] = useState<RuntimeState>({ status: "loading", services: null, message: null });

  const browserVideo = useMemo(() => getVideoUploadConfiguration({
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
    uploadPreset: import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET
  }), []);

  useEffect(() => {
    let cancelled = false;

    async function checkRuntime() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) {
          const localHint = response.status === 404
            ? "El Worker no está activo con `npm run dev`. Para probar /api/* localmente usá `npm run preview`."
            : `El health check respondió HTTP ${response.status}.`;
          if (!cancelled) setRuntime({ status: "unavailable", services: null, message: localHint });
          return;
        }

        const payload = await response.json() as { services?: RuntimeServices };
        if (!payload.services) {
          if (!cancelled) setRuntime({ status: "unavailable", services: null, message: "El health check no devolvió el estado esperado." });
          return;
        }

        if (!cancelled) setRuntime({ status: "ready", services: payload.services, message: null });
      } catch {
        if (!cancelled) setRuntime({
          status: "unavailable",
          services: null,
          message: "No pudimos consultar el Worker. En local probá `npm run preview`; en Cloudflare revisá el deploy."
        });
      }
    }

    void checkRuntime();
    return () => { cancelled = true; };
  }, []);

  const services = runtime.status === "ready" ? runtime.services : null;

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Ajustes</h1><p>Estado técnico de Hábitat v0.4.1. Los secretos se administran en Cloudflare, no desde el navegador.</p></div>
      </div>

      {runtime.status === "unavailable" && <p className="admin-status" role="status">{runtime.message}</p>}

      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-heading compact"><div><h2>Configuración del navegador</h2><p>Variables `PUBLIC_*` incorporadas durante el build.</p></div></div>
          <div className="service-list">
            <ServiceRow
              label="Supabase"
              ok={isSupabaseConfigured}
              detail={isSupabaseConfigured ? "URL y publishable key disponibles." : "Falta PUBLIC_SUPABASE_URL o la publishable key."}
            />
            <ServiceRow
              label="Cloudinary Upload"
              ok={browserVideo.configured}
              detail={browserVideo.configured ? "Cloud name, API key y upload preset disponibles." : `Falta: ${browserVideo.missing.join(", ")}`}
            />
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="panel-heading compact"><div><h2>Worker runtime</h2><p>Servicios server-side y secretos del Worker.</p></div></div>
          <div className="service-list">
            <ServiceRow label="Autenticación" ok={services?.auth ?? null} detail="Supabase URL + publishable key runtime." />
            <ServiceRow label="Administración" ok={services?.admin ?? null} detail="Incluye secret/service role para operaciones privilegiadas." />
            <ServiceRow label="Video" ok={services?.video ?? null} detail="Cloudinary cloud name + preset + API secret." />
          </div>
        </section>
      </div>

      <section className="panel settings-help">
        <h2>Prueba local correcta</h2>
        <p>`npm run dev` ejecuta sólo Astro, por eso `/api/health` devuelve 404. El flujo completo con Worker se prueba con:</p>
        <pre><code>npm run preview</code></pre>
        <p>Para producción: `npm run build` y luego `npm run deploy`.</p>
      </section>
    </main>
  );
}
