import { useEffect, useState } from "react";
import { getCurrentProfile, signOut, type Profile, type UserRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

type State =
  | { status: "loading"; profile: null; message: null }
  | { status: "ready"; profile: Profile; message: null }
  | { status: "error"; profile: null; message: string };

export function useProtectedProfile(allowedRoles: readonly UserRole[]): State {
  const rolesKey = allowedRoles.join(",");
  const [state, setState] = useState<State>({ status: "loading", profile: null, message: null });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isSupabaseConfigured) {
        setState({ status: "error", profile: null, message: "Supabase no está configurado." });
        return;
      }

      const profile = await getCurrentProfile();
      if (cancelled) return;

      if (!profile) {
        window.location.replace("/alumnos?reason=auth");
        return;
      }

      if (!profile.active) {
        await signOut();
        if (!cancelled) window.location.replace("/alumnos?reason=inactive");
        return;
      }

      if (!allowedRoles.includes(profile.role)) {
        window.location.replace(profile.role === "admin" ? "/admin" : "/alumnos/dashboard");
        return;
      }

      setState({ status: "ready", profile, message: null });
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [rolesKey]);

  return state;
}
