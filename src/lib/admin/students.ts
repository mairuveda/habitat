import { supabase } from "@/lib/supabase";

export type AdminStudent = {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  group_id: string | null;
  group_name: string | null;
};

export type StudioGroup = {
  id: string;
  name: string;
  active: boolean;
};

type CreateStudentInput = {
  email: string;
  fullName: string;
  password?: string;
  groupId?: string | null;
};

export async function listGroups(): Promise<StudioGroup[]> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase.from("groups").select("id,name,active").order("name");
  if (error) throw error;
  return (data ?? []) as StudioGroup[];
}

export async function createGroup(name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Ingresá un nombre de grupo.");
  const { error } = await supabase.from("groups").insert({ name: cleanName });
  if (error) throw error;
}

export async function listStudents(): Promise<AdminStudent[]> {
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,active")
    .eq("role", "student")
    .order("full_name");
  if (profileError) throw profileError;

  const { data: memberships, error: memberError } = await supabase
    .from("group_members")
    .select("profile_id,group_id,groups(id,name)");
  if (memberError) throw memberError;

  const groupByProfile = new Map<string, { id: string; name: string }>();
  for (const membership of memberships ?? []) {
    const raw = membership.groups as unknown;
    const group = Array.isArray(raw) ? raw[0] : raw;
    if (group && typeof group === "object" && "id" in group && "name" in group) {
      groupByProfile.set(membership.profile_id, {
        id: String((group as { id: unknown }).id),
        name: String((group as { name: unknown }).name)
      });
    }
  }

  return (profiles ?? []).map((profile) => {
    const group = groupByProfile.get(profile.id);
    return {
      id: profile.id,
      email: profile.email ?? "",
      full_name: profile.full_name ?? "",
      active: Boolean(profile.active),
      group_id: group?.id ?? null,
      group_name: group?.name ?? null
    };
  });
}

export async function createStudent(input: CreateStudentInput): Promise<{ temporaryPassword?: string }> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("La sesión expiró. Volvé a ingresar.");

  const response = await fetch("/api/admin/students", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  const payload = await response.json().catch(() => ({})) as { error?: string; temporaryPassword?: string };
  if (!response.ok) throw new Error(payload.error ?? "No pudimos crear la alumna.");
  return { temporaryPassword: payload.temporaryPassword };
}

export async function setStudentActive(id: string, active: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("profiles").update({ active }).eq("id", id).eq("role", "student");
  if (error) throw error;
}

export async function setStudentGroup(profileId: string, groupId: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");

  if (!groupId) {
    const { error } = await supabase.from("group_members").delete().eq("profile_id", profileId);
    if (error) throw error;
    return;
  }

  const { error: insertError } = await supabase
    .from("group_members")
    .upsert({ profile_id: profileId, group_id: groupId }, { onConflict: "profile_id,group_id" });
  if (insertError) throw insertError;

  const { error: cleanupError } = await supabase
    .from("group_members")
    .delete()
    .eq("profile_id", profileId)
    .neq("group_id", groupId);
  if (cleanupError) throw cleanupError;
}
