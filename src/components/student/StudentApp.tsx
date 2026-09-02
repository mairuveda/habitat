import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";
import ClassLibrary from "./ClassLibrary";

const CLASSES_PATH = "/alumnos/clases";

export default function StudentApp() {
  const auth = useProtectedProfile(["student"]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("No tenés acceso a esa sección. Te llevamos a tus clases.");
    }

    if (window.location.pathname === "/alumnos/dashboard") {
      window.history.replaceState({}, "", CLASSES_PATH);
    }

    document.title = "Tus clases · Hábitat";
  }, []);

  function navigateToClasses(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    event.preventDefault();

    if (window.location.pathname !== CLASSES_PATH) {
      window.history.replaceState({}, "", CLASSES_PATH);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }

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
          href={CLASSES_PATH}
          className="student-brand"
          aria-label="Ir a tus clases"
          onClick={navigateToClasses}
        >
          <img src="/brand/habitat-logo.png" alt="Hábitat" />
        </a>

        <nav aria-label="Navegación del portal">
          <a
            className="active"
            href={CLASSES_PATH}
            aria-current="page"
            onClick={navigateToClasses}
          >
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
