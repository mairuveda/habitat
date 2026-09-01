import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/auth";
import { getVideoUploadConfiguration } from "@/lib/browser-config";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Props = {
  profile: Profile;
};

type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  video: boolean;
};

type RuntimeState =
  | { status: "loading"; services: null; message: null }
  | { status: "ready"; services: RuntimeServices; message: null }
  | { status: "unavailable"; services: null; message: string };

function ServiceRow({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <div className="service-row compact-service-row">
      <span className={ok === true ? "service-dot ok" : ok === false ? "service-dot error" : "service-dot"} aria-hidden="true" />
      <strong>{label}</strong>
      <span className={ok === true ? "status-pill active" : "status-pill"}>{ok === null ? "Sin verificar" : ok ? "Operativo" : "Revisar"}</span>
    </div>
  );
}

export default function AdminSettings({ profile }: Props) {
  const [runtime, setRuntime] = useState<RuntimeState>({ status: "loading", services: null, message: null });
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

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
          const message = response.status === 404
            ? "El backend no está activo en esta ejecución local."
            : `El backend respondió HTTP ${response.status}.`;
          if (!cancelled) setRuntime({ status: "unavailable", services: null, message });
          return;
        }

        const payload = await response.json() as { services?: RuntimeServices };
        if (!payload.services) {
          if (!cancelled) setRuntime({ status: "unavailable", services: null, message: "No pudimos verificar el estado del sistema." });
          return;
        }

        if (!cancelled) setRuntime({ status: "ready", services: payload.services, message: null });
      } catch {
        if (!cancelled) setRuntime({ status: "unavailable", services: null, message: "No pudimos consultar el backend." });
      }
    }

    void checkRuntime();
    return () => { cancelled = true; };
  }, []);

  async function submitPassword(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setPasswordStatus(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 8) {
      setPasswordStatus("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setPasswordStatus("Las contraseñas no coinciden.");
      return;
    }
    if (!supabase) {
      setPasswordStatus("El servicio de cuenta no está disponible.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      event.currentTarget.reset();
      setPasswordStatus("Contraseña actualizada correctamente.");
    } catch {
      setPasswordStatus("No pudimos actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  const services = runtime.status === "ready" ? runtime.services : null;
  const systemOk = Boolean(
    isSupabaseConfigured
    && browserVideo.configured
    && services?.auth
    && services?.admin
    && services?.video
  );

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Ajustes</h1><p>Tu cuenta, seguridad y estado general del portal.</p></div>
      </div>

      <div className="settings-grid account-settings-grid">
        <section className="panel settings-panel">
          <div className="panel-heading compact"><div><h2>Mi cuenta</h2><p>Datos de la cuenta con la que administrás Hábitat.</p></div></div>
          <dl className="account-details">
            <div><dt>Nombre</dt><dd>{profile.full_name || "Administradora"}</dd></div>
            <div><dt>Email</dt><dd>{profile.email}</dd></div>
            <div><dt>Perfil</dt><dd>Administración</dd></div>
          </dl>
          <a className="text-action" href="/" target="_blank" rel="noreferrer">Ver sitio público ↗</a>
        </section>

        <section className="panel settings-panel">
          <div className="panel-heading compact"><div><h2>Seguridad</h2><p>Cambiá la contraseña de tu cuenta de administración.</p></div></div>
          <form className="password-form" onSubmit={submitPassword}>
            <label>Nueva contraseña<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
            <label>Repetir contraseña<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
            <button className="button" type="submit" disabled={savingPassword}>{savingPassword ? "Guardando…" : "Actualizar contraseña"}</button>
          </form>
          {passwordStatus && <p className="settings-inline-status" role="status">{passwordStatus}</p>}
        </section>
      </div>

      <section className="panel system-status-panel">
        <div className="system-status-heading">
          <div><h2>Estado del sistema</h2><p>Comprobación rápida de los servicios que usa el portal.</p></div>
          <span className={systemOk ? "status-pill active" : "status-pill"}>{systemOk ? "Todo operativo" : "Revisar"}</span>
        </div>

        {runtime.status === "unavailable" && <p className="admin-status" role="status">{runtime.message}</p>}

        <div className="service-list service-list-horizontal">
          <ServiceRow label="Cuenta y acceso" ok={services?.auth ?? null} />
          <ServiceRow label="Administración" ok={services?.admin ?? null} />
          <ServiceRow label="Videos" ok={services?.video ?? null} />
        </div>

        <details className="technical-diagnostics">
          <summary>Diagnóstico técnico</summary>
          <div className="diagnostic-grid">
            <div><span>Supabase navegador</span><strong>{isSupabaseConfigured ? "OK" : "Pendiente"}</strong></div>
            <div><span>Cloudinary navegador</span><strong>{browserVideo.configured ? "OK" : "Pendiente"}</strong></div>
            <div><span>Worker</span><strong>{runtime.status === "ready" ? "OK" : "No verificado"}</strong></div>
            <div><span>Versión</span><strong>0.4.1</strong></div>
          </div>
          {!browserVideo.configured && <p>Configuración de video incompleta: {browserVideo.missing.join(", ")}.</p>}
          {runtime.status === "unavailable" && <p>En desarrollo local, el backend `/api/*` se prueba con <code>pnpm preview</code>.</p>}
        </details>
      </section>
    </main>
  );
}
