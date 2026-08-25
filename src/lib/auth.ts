import { supabase } from "./supabase";

export type UserRole = "admin" | "student";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active")
    .eq("id", authData.user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}
