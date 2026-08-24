import { isSupabaseConfigured, supabase } from "./supabase";

export type PilatesClass = {
  id: string;
  title: string;
  description: string;
  duration: number;
  level: "Principiante" | "Intermedio" | "Todos";
  category: "Viajes" | "Movilidad" | "Quick Flow" | "Fuerza" | string;
  image: string;
  playbackUrl?: string;
};

export type NewPilatesClass = {
  title: string;
  description?: string;
  durationMinutes?: number;
  level: string;
  category: string;
  videoProvider: "cloudinary" | "r2" | "stream";
  videoRef: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  published?: boolean;
};

export async function listVisibleClasses(): Promise<PilatesClass[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("classes")
    .select("id,title,description,category,level,duration_minutes,playback_url,thumbnail_url")
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
    image: item.thumbnail_url || "/images/classes/pilates-maleta.jpg",
    playbackUrl: item.playback_url || undefined
  }));
}

export async function createClass(input: NewPilatesClass): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Necesitás iniciar sesión como administradora.");

  const { data, error } = await supabase
    .from("classes")
    .insert({
      title: input.title,
      description: input.description ?? "",
      category: input.category,
      level: input.level,
      duration_minutes: input.durationMinutes ?? null,
      video_provider: input.videoProvider,
      video_ref: input.videoRef,
      playback_url: input.playbackUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      published: input.published ?? true,
      created_by: authData.user.id
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
