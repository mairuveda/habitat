import { useEffect, useState } from "react";
import ClassLibrary from "./ClassLibrary";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";

export type StudentPage = "home" | "classes";

type Props = {
  page?: StudentPage;
};

const menu: Array<{ page: StudentPage; label: string; href: string; title: string }> = [
  { page: "home", label: "Inicio", href: "/alumnos/dashboard", title: "Mi espacio · Hábitat" },
  { page: "classes", label: "Clases", href: "/alumnos/clases", title: "Mis clases · Hábitat" }
];

function pageFromPath(pathname: string): StudentPage {
  return pathname === "/alumnos/clases" ? "classes" : "home";
}

export default function StudentApp({ page = "home" }: Props) {
  const auth = useProtectedProfile(["student"]);
  const [currentPage, setCurrentPage] = useState<StudentPage>(page);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("No tenés acceso a esa sección. Te llevamos a tu portal de alumnos.");
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const item = menu.find((entry) => entry.page === currentPage);
    if (item) document.title = item.title;
  }, [currentPage]);

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, nextPage: StudentPage, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname !== href) window.history.pushState({}, "", href);
    setCurrentPage(nextPage);
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
          href="/alumnos/dashboard"
          className="student-brand"
          aria-label="Ir al inicio del portal"
          onClick={(event) => navigate(event, "home", "/alumnos/dashboard")}
        >
          <img src="/brand/habitat-logo.png" alt="Hábitat" />
        </a>
        <nav>
          {menu.map((item) => (
            <a
              className={item.page === currentPage ? "active" : ""}
              href={item.href}
              key={item.page}
              onClick={(event) => navigate(event, item.page, item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <section className="student-main">
        {notice && <p className="library-status" role="status">{notice}</p>}
        <div className="student-header">
          {currentPage === "home" ? (
            <div><h1>¡Bienvenida, {displayName}!</h1><p>Este es tu espacio para fluir en movimiento.</p></div>
          ) : (
            <div><h1>Mis clases</h1><p>Contenido disponible para tu cuenta y tu grupo.</p></div>
          )}
        </div>
        <ClassLibrary />
      </section>
    </div>
  );
}
