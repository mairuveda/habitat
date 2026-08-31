import { useEffect, useState } from "react";
import ClassLibrary from "./ClassLibrary";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";

const menu = ["Inicio", "Clases", "Mi práctica", "Favoritos", "Mi progreso", "Mensajes", "Ajustes"];

export default function StudentApp() {
  const auth = useProtectedProfile(["student"]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("No tenés acceso a esa sección. Te llevamos a tu portal de alumnos.");
    }
  }, []);

  if (auth.status === "loading") {
    return <div className="auth-loading">Validando tu acceso…</div>;
  }

  if (auth.status === "error") {
    return <div className="auth-loading auth-error">{auth.message}</div>;
  }

  const displayName = auth.profile.full_name.trim().split(/\s+/)[0] || "alumna";

  return (
    <div className="student-app">
      <aside>
        <a href="/" className="student-brand"><img src="/brand/habitat-logo.png" alt="Hábitat" /></a>
        <nav>{menu.map((label, index) => <a className={index === 0 ? "active" : ""} href="#" key={label}>{label}</a>)}</nav>
        <LogoutButton />
      </aside>
      <section className="student-main">
        {notice && <p className="library-status" role="status">{notice}</p>}
        <div className="student-header">
          <div><h1>¡Bienvenida, {displayName}!</h1><p>Este es tu espacio para fluir en movimiento.</p></div>
        </div>
        <ClassLibrary />
      </section>
    </div>
  );
}
