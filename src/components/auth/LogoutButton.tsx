import { useState } from "react";
import { signOut } from "@/lib/auth";

export default function LogoutButton({ className = "logout" }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await signOut();
    window.location.href = "/alumnos";
  }

  return (
    <button className={className} type="button" onClick={logout} disabled={loading}>
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
