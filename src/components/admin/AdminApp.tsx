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

const menu: Array<{ page: AdminPage; label: string; href: string }> = [
  { page: "dashboard", label: "Dashboard", href: "/admin" },
  { page: "students", label: "Alumnas", href: "/admin/alumnas" },
  { page: "groups", label: "Grupos", href: "/admin/grupos" },
  { page: "classes", label: "Clases", href: "/admin/clases" },
  { page: "settings", label: "Ajustes", href: "/admin/ajustes" }
];

export default function AdminApp({ page = "dashboard" }: Props) {
  const auth = useProtectedProfile(["admin"]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("Tu cuenta no tiene acceso al portal solicitado. Te llevamos al panel de administración.");
    }
  }, []);

  if (auth.status === "loading") {
    return <div className="auth-loading">Validando acceso de administración…</div>;
  }

  if (auth.status === "error") {
    return <div className="auth-loading auth-error">{auth.message}</div>;
  }

  return (
    <div className="admin-shell">
      <aside>
        <a href="/" className="brand"><img src="/brand/habitat-logo.png" alt="Hábitat" /></a>
        <nav>
          {menu.map((item) => (
            <a className={item.page === page ? "active" : ""} href={item.href} key={item.page}>
              {item.label}
            </a>
          ))}
        </nav>
        <LogoutButton />
      </aside>

      {page === "dashboard" && <AdminDashboard adminName={auth.profile.full_name} routeNotice={notice} />}
      {page === "students" && <AdminStudents />}
      {page === "groups" && <AdminGroups />}
      {page === "classes" && <AdminClasses />}
      {page === "settings" && <AdminSettings />}
    </div>
  );
}
