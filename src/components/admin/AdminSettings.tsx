import { useEffect, useState } from "react";
import type { Profile } from "@/lib/auth";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { getSupabase } from "@/lib/supabase";

type Props = {
  profile: Profile;
};

type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  videoUpload: boolean;
  videoPlayback: boolean;
  videoDelete: boolean;
};

type RuntimeReadiness = {
  ready: boolean;
  services: RuntimeServices;
  missing?: string[];
};

type RuntimeState =
  | { status: "loading"; readiness: null; message: null }
  | { status: "checked"; readiness: RuntimeReadiness; message: string | null }
  | { status: "unavailable"; readiness: null; message: string };

function ServiceRow({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <div className="service-row compact-service-row">
      <span
        className={
          ok === true
            ? "service-dot ok"
            : ok === false
              ? "service-dot error"
              : "service-dot"
        }
        aria-hidden="true"
      />

      <strong>{label}</strong>

      <span className={ok === true ? "status-pill active" : "status-pill"}>
        {ok === null ? "Sin verificar" : ok ? "Operativo" : "Revisar"}
      </span>
    </div>
  );
}

export default function AdminSettings({ profile }: Props) {
  const [runtime, setRuntime] = useState<RuntimeState>({
    status: "loading",
    readiness: null,
    message: null
  });
  const [publicConfigReady, setPublicConfigReady] = useState<boolean | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRuntime() {
      try {
        const [readyResponse] = await Promise.all([
          fetch("/api/ready", {
            cache: "no-store",
            headers: { accept: "application/json" }
          }),
          getRuntimeConfig().then(() => {
            if (!cancelled) setPublicConfigReady(true);
          })
        ]);

        if (readyResponse.status === 404) {
          if (!cancelled) {
            setRuntime({
              status: "unavailable",
              readiness: null,
              message: "El backend no está activo en esta ejecución."
            });
          }
          return;
        }

        const payload = await readyResponse.json().catch(() => ({})) as Partial<RuntimeReadiness>;

        if (typeof payload.ready !== "boolean" || !payload.services) {
          if (!cancelled) {
            setRuntime({
              status: "unavailable",
              readiness: null,
              message: "No pudimos verificar el estado del sistema."
            });
          }
          return;
        }

        if (!cancelled) {
          setRuntime({
            status: "checked",
            readiness: payload as RuntimeReadiness,
            message: readyResponse.ok
              ? null
              : "Hay servicios pendientes de configuración."
          });
        }
      } catch {
        if (!cancelled) {
          setPublicConfigReady(false);
          setRuntime({
            status: "unavailable",
            readiness: null,
            message: "No pudimos consultar el backend."
          });
        }
      }
    }

    void checkRuntime();
    return () => { cancelled = true; };
  }, []);

  async function submitPassword(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    setPasswordStatus(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 12) {
      setPasswordStatus("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }

    if (password.length > 128) {
      setPasswordStatus("La nueva contraseña es demasiado larga.");
      return;
    }

    if (password !== confirmation) {
      setPasswordStatus("Las contraseñas no coinciden.");
      return;
    }

    setSavingPassword(true);

    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      formElement.reset();
      setPasswordStatus("Contraseña actualizada correctamente.");
    } catch {
      setPasswordStatus("No pudimos actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  const readiness = runtime.status === "checked" ? runtime.readiness : null;
  const services = readiness?.services ?? null;
  const videosOk = Boolean(
    services?.videoUpload
    && services.videoPlayback
    && services.videoDelete
  );
  const systemOk = Boolean(publicConfigReady && readiness?.ready);

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <h1>Ajustes</h1>
          <p>Tu cuenta, seguridad y estado general del portal.</p>
        </div>
      </div>

      <div className="settings-grid account-settings-grid">
        <section className="panel settings-panel">
          <div className="panel-heading compact">
            <div>
              <h2>Mi cuenta</h2>
              <p>Datos de la cuenta con la que administrás Hábitat.</p>
            </div>
          </div>

          <dl className="account-details">
            <div><dt>Nombre</dt><dd>{profile.full_name || "Administradora"}</dd></div>
            <div><dt>Email</dt><dd>{profile.email}</dd></div>
            <div><dt>Perfil</dt><dd>Administración</dd></div>
          </dl>

          <a
            className="text-action"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver sitio público ↗
          </a>
        </section>

        <section className="panel settings-panel">
          <div className="panel-heading compact">
            <div>
              <h2>Seguridad</h2>
              <p>Cambiá la contraseña de tu cuenta de administración.</p>
            </div>
          </div>

          <form className="password-form" onSubmit={submitPassword}>
            <label>
              Nueva contraseña
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Repetir contraseña
              <input
                name="confirmation"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>

            <button className="button" type="submit" disabled={savingPassword}>
              {savingPassword ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </form>

          {passwordStatus && (
            <p className="settings-inline-status" role="status">
              {passwordStatus}
            </p>
          )}
        </section>
      </div>

      <section className="panel system-status-panel">
        <div className="system-status-heading">
          <div>
            <h2>Estado del sistema</h2>
            <p>Comprobación rápida de los servicios que usa el portal.</p>
          </div>

          <span className={systemOk ? "status-pill active" : "status-pill"}>
            {systemOk ? "Todo operativo" : "Revisar"}
          </span>
        </div>

        {runtime.message && (
          <p className="admin-status" role="status">{runtime.message}</p>
        )}

        <div className="service-list service-list-horizontal">
          <ServiceRow label="Cuenta y acceso" ok={services?.auth ?? null} />
          <ServiceRow label="Administración" ok={services?.admin ?? null} />
          <ServiceRow label="Videos" ok={services ? videosOk : null} />
        </div>

        <details className="technical-diagnostics">
          <summary>Diagnóstico técnico</summary>

          <div className="diagnostic-grid">
            <div>
              <span>Configuración pública</span>
              <strong>{publicConfigReady ? "OK" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Carga de video</span>
              <strong>{services?.videoUpload ? "OK" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Reproducción</span>
              <strong>{services?.videoPlayback ? "OK" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Eliminación</span>
              <strong>{services?.videoDelete ? "OK" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Versión</span>
              <strong>0.4.1</strong>
            </div>
          </div>

          {readiness?.missing && readiness.missing.length > 0 && (
            <p>
              Configuración local pendiente:{" "}
              <code>{readiness.missing.join(", ")}</code>.
            </p>
          )}

          {runtime.status === "unavailable" && (
            <p>
              El backend `/api/*` se prueba localmente con{" "}
              <code>pnpm preview</code>.
            </p>
          )}
        </details>
      </section>
    </main>
  );
}
