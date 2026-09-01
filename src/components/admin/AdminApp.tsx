import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";
import AdminClasses from "./AdminClasses";
import AdminDashboard from "./AdminDashboard";
import AdminGroups from "./AdminGroups";
import AdminSettings from "./AdminSettings";
import AdminStudents from "./AdminStudents";

export type AdminPage = "dashboard" | "students" | "groups" | "classes" | "settings";

type Props = {
  page?: AdminPage;
};

const menu: Array<{ page: AdminPage; label: string; href: string; title: string }> = [
  { page: "dashboard", label: "Dashboard", href: "/admin", title: "Administración · Hábitat" },
  { page: "students", label: "Alumnas", href: "/admin/alumnas", title: "Alumnas · Hábitat" },
  { page: "groups", label: "Grupos", href: "/admin/grupos", title: "Grupos · Hábitat" },
  { page: "classes", label: "Clases", href: "/admin/clases", title: "Clases · Hábitat" },
  { page: "settings", label: "Ajustes", href: "/admin/ajustes", title: "Ajustes · Hábitat" }
];

function pageFromPath(pathname: string): AdminPage {
  if (pathname === "/admin/alumnas") return "students";
  if (pathname === "/admin/grupos") return "groups";
  if (pathname === "/admin/clases") return "classes";
  if (pathname === "/admin/ajustes") return "settings";
  return "dashboard";
}

export default function AdminApp({ page = "dashboard" }: Props) {
  const auth = useProtectedProfile(["admin"]);
  const [currentPage, setCurrentPage] = useState<AdminPage>(page);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("Tu cuenta no tiene acceso al portal solicitado. Te llevamos al panel de administración.");
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

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, nextPage: AdminPage, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname !== href) window.history.pushState({}, "", href);
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (auth.status === "loading") {
    return <div className="auth-loading">Validando acceso de administración…</div>;
  }

  if (auth.status === "error") {
    return <div className="auth-loading auth-error">{auth.message}</div>;
  }

  return (
    <div className="admin-shell">
      <aside>
        <a
          href="/admin"
          className="brand"
          aria-label="Ir al dashboard de administración"
          onClick={(event) => navigate(event, "dashboard", "/admin")}
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

      {currentPage === "dashboard" && <AdminDashboard adminName={auth.profile.full_name} routeNotice={notice} />}
      {currentPage === "students" && <AdminStudents />}
      {currentPage === "groups" && <AdminGroups />}
      {currentPage === "classes" && <AdminClasses />}
      {currentPage === "settings" && <AdminSettings profile={auth.profile} />}
    </div>
  );
}
