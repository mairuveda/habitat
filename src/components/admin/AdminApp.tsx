import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedProfile } from "@/components/auth/useProtectedProfile";
import AdminDashboard from "./AdminDashboard";

const menu = ["Dashboard", "Alumnas", "Grupos", "Clases", "Ajustes"];

export default function AdminApp() {
  const auth = useProtectedProfile(["admin"]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "forbidden") {
      setNotice("Tu cuenta no tiene acceso al portal solicitado. Te llevamos al panel de administración.");
    }
  }, []);

  if (auth.status === "loading") return <div className="auth-loading">Validando acceso de administración…</div>;
  if (auth.status === "error") return <div className="auth-loading auth-error">{auth.message}</div>;

  return (
    <div className="admin-shell">
      <aside>
        <a href="/" className="brand"><img src="/brand/habitat-logo.png" alt="Hábitat" /></a>
        <nav>{menu.map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav>
        <LogoutButton />
      </aside>
      <AdminDashboard adminName={auth.profile.full_name} routeNotice={notice} />
    </div>
  );
}
