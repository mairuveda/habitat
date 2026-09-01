import { useEffect, useState } from "react";
import ClassLibrary from "./ClassLibrary";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";

export type StudentPage = "home" | "classes";

type Props = {
  page?: StudentPage;
};

const menu: Array<{ page: StudentPage; label: string; href: string }> = [
  { page: "home", label: "Inicio", href: "/alumnos/dashboard" },
  { page: "classes", label: "Clases", href: "/alumnos/clases" }
];

export default function StudentApp({ page = "home" }: Props) {
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
        <nav>
          {menu.map((item) => (
            <a className={item.page === page ? "active" : ""} href={item.href} key={item.page}>{item.label}</a>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <section className="student-main">
        {notice && <p className="library-status" role="status">{notice}</p>}
        <div className="student-header">
          {page === "home" ? (
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
