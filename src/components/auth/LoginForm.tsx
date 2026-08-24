import { useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Props = { redirectTo?: string };

export default function LoginForm({ redirectTo = "/alumnos/dashboard" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      window.location.href = redirectTo;
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage("No pudimos iniciar sesión. Revisá el correo y la contraseña.");
      return;
    }

    window.location.href = redirectTo;
  }

  async function useMagicLink() {
    if (!email) {
      setMessage("Ingresá tu correo para recibir el enlace de acceso.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage("El acceso por enlace se activa al conectar Supabase.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` }
    });
    setLoading(false);
    setMessage(error ? "No pudimos enviar el enlace." : "Te enviamos un enlace de acceso al correo.");
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        Correo electrónico
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" required />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
      </label>
      <button className="login-primary" disabled={loading}>{loading ? "Ingresando…" : "Entrar"}</button>
      <button className="login-link" type="button" onClick={useMagicLink} disabled={loading}>Entrar con enlace al correo</button>
      {!isSupabaseConfigured && <p className="demo-note">Modo visual: todavía no hay proyecto Supabase conectado.</p>}
      {message && <p className="login-message" role="status">{message}</p>}
    </form>
  );
}
