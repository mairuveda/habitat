import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";
import ClassLibrary from "./ClassLibrary";

export default function StudentApp() {
  const auth = useProtectedProfile(["student"]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("No tenés acceso a esa sección. Te llevamos a tus clases.");
    }

    if (window.location.pathname === "/alumnos/dashboard") {
      window.history.replaceState({}, "", "/alumnos/clases");
    }

    document.title = "Tus clases · Hábitat";
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
        <a
          href="/alumnos/clases"
          className="student-brand"
          aria-label="Ir a tus clases"
        >
          <img src="/brand/habitat-logo.png" alt="Hábitat" />
        </a>

        <nav aria-label="Navegación del portal">
          <a className="active" href="/alumnos/clases" aria-current="page">
            Clases
          </a>
        </nav>

        <LogoutButton />
      </aside>

      <section className="student-main">
        {notice && <p className="library-status" role="status">{notice}</p>}

        <header className="student-header">
          <h1>Hola, {displayName}</h1>
          <p>Elegí una práctica para comenzar.</p>
        </header>

        <ClassLibrary />
      </section>
    </div>
  );
}
