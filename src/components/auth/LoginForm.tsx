import { useEffect, useState } from "react";
import { getCurrentProfile, signOut } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const reasonMessages: Record<string, string> = {
  auth: "Iniciá sesión para continuar.",
  inactive: "Tu acceso está suspendido. Contactá al estudio.",
  expired: "Tu sesión terminó. Volvé a iniciar sesión.",
  validation: "No pudimos validar tu sesión anterior. Volvé a iniciar sesión.",
  config: "El acceso está temporalmente no disponible. La configuración del servicio está incompleta."
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason && reasonMessages[reason]) setMessage(reasonMessages[reason]);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setMessage("El servicio de autenticación no está disponible en este momento.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("No pudimos iniciar sesión. Revisá el correo y la contraseña.");
        return;
      }

      const profile = await getCurrentProfile();
      if (!profile) {
        await signOut().catch(() => undefined);
        setMessage("No encontramos un perfil habilitado para esta cuenta.");
        return;
      }

      if (!profile.active) {
        await signOut().catch(() => undefined);
        setMessage("Tu acceso está suspendido. Contactá al estudio.");
        return;
      }

      window.location.replace(profile.role === "admin" ? "/admin" : "/alumnos/dashboard");
    } catch {
      await signOut().catch(() => undefined);
      setMessage("No pudimos validar tu sesión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        Correo electrónico
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          required
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </label>
      <button className="login-primary" disabled={loading}>
        {loading ? "Ingresando…" : "Entrar"}
      </button>
      {message && <p className="login-message" role="status">{message}</p>}
    </form>
  );
}
