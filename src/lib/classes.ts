import { isSupabaseConfigured, supabase } from "./supabase";

export type PilatesClass = {
  id: string;
  title: string;
  description: string;
  duration: number;
  level: "Principiante" | "Intermedio" | "Todos";
  category: "Viajes" | "Movilidad" | "Quick Flow" | "Fuerza" | string;
  image: string;
};

export type AdminPilatesClass = PilatesClass & {
  published: boolean;
  created_at: string;
};

export type NewPilatesClass = {
  title: string;
  description?: string;
  durationMinutes?: number;
  level: string;
  category: string;
  videoProvider: "cloudinary" | "r2" | "stream";
  videoRef: string;
  videoDeliveryType: "authenticated" | "upload" | "private";
  videoFormat?: string;
  videoVersion?: number;
  published?: boolean;
  groupIds?: string[];
};

export async function listVisibleClasses(): Promise<PilatesClass[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase no está configurado.");

  const { data, error } = await supabase
    .from("classes")
    .select("id,title,description,category,level,duration_minutes")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    duration: item.duration_minutes ?? 0,
    level: item.level as PilatesClass["level"],
    category: item.category,
    image: classImage(item.category)
  }));
}

export async function listAdminClasses(): Promise<AdminPilatesClass[]> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase
    .from("classes")
    .select("id,title,description,category,level,duration_minutes,published,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    duration: item.duration_minutes ?? 0,
    level: item.level as PilatesClass["level"],
    category: item.category,
    image: classImage(item.category),
    published: Boolean(item.published),
    created_at: item.created_at
  }));
}

export async function countClasses(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase.from("classes").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function createClass(input: NewPilatesClass): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase no está configurado.");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Necesitás iniciar sesión como administradora.");

  const { data, error } = await supabase
    .from("classes")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      category: input.category,
      level: input.level,
      duration_minutes: input.durationMinutes ?? null,
      video_provider: input.videoProvider,
      video_ref: input.videoRef,
      video_delivery_type: input.videoDeliveryType,
      video_format: input.videoFormat ?? null,
      video_version: input.videoVersion ?? null,
      playback_url: null,
      thumbnail_url: null,
      published: input.published ?? true,
      created_by: authData.user.id
    })
    .select("id")
    .single();

  if (error) throw error;

  const groupIds = Array.from(new Set(input.groupIds ?? [])).filter(Boolean);
  if (groupIds.length > 0) {
    const { error: groupError } = await supabase
      .from("class_groups")
      .insert(groupIds.map((groupId) => ({ class_id: data.id, group_id: groupId })));
    if (groupError) {
      await supabase.from("classes").delete().eq("id", data.id);
      throw groupError;
    }
  }

  return data.id;
}

export async function setClassPublished(id: string, published: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("classes").update({ published }).eq("id", id);
  if (error) throw error;
}

export async function getPlaybackUrl(classId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("La sesión expiró.");

  const response = await fetch(`/api/classes/${encodeURIComponent(classId)}/playback`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error ?? "No pudimos abrir el video.");
  return payload.url;
}

function classImage(category: string): string {
  const value = category.toLowerCase();
  if (value.includes("movilidad")) return "/images/classes/movilidad-total.jpg";
  if (value.includes("fuerza")) return "/images/classes/fuerza-control.jpg";
  if (value.includes("quick") || value.includes("energ")) return "/images/classes/energia-20.jpg";
  return "/images/classes/pilates-maleta.jpg";
}
