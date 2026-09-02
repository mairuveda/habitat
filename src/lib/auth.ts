import { getSupabase } from "./supabase";

export type UserRole = "admin" | "student";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
};

const VALIDATION_TIMEOUT_MS = 6_000;

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs = VALIDATION_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("La validación de sesión tardó demasiado.")),
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await getSupabase();

  const { data: sessionData, error: sessionError } = await withTimeout(supabase.auth.getSession());
  if (sessionError) throw new Error("No pudimos leer tu sesión.");
  if (!sessionData.session) return null;

  const { data: authData, error: authError } = await withTimeout(supabase.auth.getUser());
  if (authError || !authData.user) return null;

  const { data, error } = await withTimeout(
    supabase
      .from("profiles")
      .select("id,email,full_name,role,active")
      .eq("id", authData.user.id)
      .maybeSingle()
  );

  if (error) throw new Error("No pudimos validar tu perfil.");
  return data ? data as Profile : null;
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut({ scope: "local" });
}
