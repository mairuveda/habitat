import { useEffect, useState } from "react";
import { getCurrentProfile, signOut, type Profile, type UserRole } from "@/lib/auth";
import { RuntimeConfigurationError } from "@/lib/runtime-config";

type State =
  | { status: "loading"; profile: null; message: null }
  | { status: "ready"; profile: Profile; message: null }
  | { status: "error"; profile: null; message: string };

function routeForRole(role: UserRole, reason?: string): string {
  const base = role === "admin" ? "/admin" : "/alumnos/dashboard";
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base;
}

export function useProtectedProfile(allowedRoles: readonly UserRole[]): State {
  const rolesKey = allowedRoles.join(",");
  const [state, setState] = useState<State>({
    status: "loading",
    profile: null,
    message: null
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const profile = await getCurrentProfile();
        if (cancelled) return;

        if (!profile) {
          await signOut().catch(() => undefined);
          if (!cancelled) window.location.replace("/alumnos?reason=auth");
          return;
        }

        if (!profile.active) {
          await signOut().catch(() => undefined);
          if (!cancelled) window.location.replace("/alumnos?reason=inactive");
          return;
        }

        if (!allowedRoles.includes(profile.role)) {
          window.location.replace(routeForRole(profile.role, "forbidden"));
          return;
        }

        setState({ status: "ready", profile, message: null });
      } catch (error) {
        await signOut().catch(() => undefined);

        if (!cancelled) {
          window.location.replace(
            error instanceof RuntimeConfigurationError
              ? "/alumnos?reason=config"
              : "/alumnos?reason=validation"
          );
        }
      }
    }

    void check();
    return () => { cancelled = true; };
  }, [rolesKey]);

  return state;
}
