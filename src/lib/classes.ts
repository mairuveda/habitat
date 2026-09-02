import { getSupabase } from "./supabase";

export type ClassAccessScope = "all" | "selected" | "none";

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
  access_scope: ClassAccessScope;
};

export type ClassGroupAssignment = {
  class_id: string;
  group_id: string;
};

export type ClassStudentOverride = {
  class_id: string;
  profile_id: string;
  allowed: boolean;
};

export type ClassAccessData = {
  groupAssignments: ClassGroupAssignment[];
  overrides: ClassStudentOverride[];
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEVELS = new Set(["Principiante", "Intermedio", "Todos"]);
const ACCESS_SCOPES = new Set<ClassAccessScope>(["all", "selected", "none"]);

function validateClassInput(input: NewPilatesClass) {
  const title = input.title.trim();
  const description = input.description?.trim() ?? "";
  const category = input.category.trim();

  if (!title || title.length > 160) throw new Error("Ingresá un título válido.");
  if (description.length > 2_000) throw new Error("La descripción es demasiado larga.");
  if (!category || category.length > 80) throw new Error("Ingresá una categoría válida.");
  if (!LEVELS.has(input.level)) throw new Error("El nivel seleccionado no es válido.");
  if (input.videoProvider !== "cloudinary") {
    throw new Error("El proveedor de video no está soportado en esta versión.");
  }
  if (input.videoDeliveryType !== "authenticated") {
    throw new Error("El video debe quedar privado antes de publicar la clase.");
  }
  if (!input.videoRef || input.videoRef.length > 500 || /[\u0000-\u001f]/.test(input.videoRef)) {
    throw new Error("La referencia del video no es válida.");
  }

  const groupIds = Array.from(new Set(input.groupIds ?? [])).filter(Boolean);
  if (groupIds.some((id) => !UUID.test(id))) throw new Error("Hay un grupo inválido.");

  return { title, description, category, groupIds };
}

function validateUuid(value: string, message: string): string {
  if (!UUID.test(value)) throw new Error(message);
  return value;
}

export async function listVisibleClasses(): Promise<PilatesClass[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("classes")
    .select("id,title,description,category,level,duration_minutes")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error("No pudimos cargar las clases.");

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
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("classes")
    .select("id,title,description,category,level,duration_minutes,published,created_at,access_scope")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error("No pudimos cargar las clases.");

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    duration: item.duration_minutes ?? 0,
    level: item.level as PilatesClass["level"],
    category: item.category,
    image: classImage(item.category),
    published: Boolean(item.published),
    created_at: item.created_at,
    access_scope: ACCESS_SCOPES.has(item.access_scope as ClassAccessScope)
      ? item.access_scope as ClassAccessScope
      : "all"
  }));
}

export async function listClassAccessData(): Promise<ClassAccessData> {
  const supabase = await getSupabase();

  const [
    { data: groupAssignments, error: groupError },
    { data: overrides, error: overrideError }
  ] = await Promise.all([
    supabase.from("class_groups").select("class_id,group_id"),
    supabase.from("class_student_access").select("class_id,profile_id,allowed")
  ]);

  if (groupError || overrideError) {
    throw new Error("No pudimos cargar los permisos de clases.");
  }

  return {
    groupAssignments: (groupAssignments ?? []) as ClassGroupAssignment[],
    overrides: (overrides ?? []) as ClassStudentOverride[]
  };
}

export async function countClasses(): Promise<number> {
  const supabase = await getSupabase();
  const { count, error } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error("No pudimos contar las clases.");
  return count ?? 0;
}

export async function createClass(input: NewPilatesClass): Promise<string> {
  const supabase = await getSupabase();
  const validated = validateClassInput(input);

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    window.location.replace("/alumnos?reason=expired");
    throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
  }

  const accessScope: ClassAccessScope = validated.groupIds.length > 0
    ? "selected"
    : "all";

  const { data, error } = await supabase
    .from("classes")
    .insert({
      title: validated.title,
      description: validated.description,
      category: validated.category,
      level: input.level,
      duration_minutes: input.durationMinutes ?? null,
      video_provider: input.videoProvider,
      video_ref: input.videoRef,
      video_delivery_type: input.videoDeliveryType,
      video_format: input.videoFormat ?? null,
      video_version: input.videoVersion ?? null,
      playback_url: null,
      thumbnail_url: null,
      published: false,
      access_scope: accessScope,
      created_by: authData.user.id
    })
    .select("id")
    .single();

  if (error) throw new Error("No pudimos guardar la clase.");

  if (validated.groupIds.length > 0) {
    const { error: groupError } = await supabase
      .from("class_groups")
      .insert(
        validated.groupIds.map((groupId) => ({
          class_id: data.id,
          group_id: groupId
        }))
      );

    if (groupError) {
      await supabase.from("classes").delete().eq("id", data.id);
      throw new Error("No pudimos asignar los grupos; la clase no fue publicada.");
    }
  }

  if (input.published ?? true) {
    const { error: publishError } = await supabase
      .from("classes")
      .update({ published: true })
      .eq("id", data.id);

    if (publishError) {
      throw new Error("La clase quedó guardada como borrador, pero no pudimos publicarla.");
    }
  }

  return data.id;
}

export async function setClassPublished(id: string, published: boolean): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("classes")
    .update({ published })
    .eq("id", validateUuid(id, "Clase inválida."));

  if (error) throw new Error("No pudimos cambiar la publicación de la clase.");
}

export async function setClassAccessScope(
  classId: string,
  scope: ClassAccessScope
): Promise<void> {
  if (!ACCESS_SCOPES.has(scope)) throw new Error("Alcance de acceso inválido.");

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("classes")
    .update({ access_scope: scope })
    .eq("id", validateUuid(classId, "Clase inválida."));

  if (error) throw new Error("No pudimos cambiar el alcance de la clase.");
}

export async function setClassGroupAccess(
  classId: string,
  groupId: string,
  enabled: boolean
): Promise<void> {
  const supabase = await getSupabase();
  const safeClassId = validateUuid(classId, "Clase inválida.");
  const safeGroupId = validateUuid(groupId, "Grupo inválido.");

  if (enabled) {
    const { error } = await supabase
      .from("class_groups")
      .upsert(
        { class_id: safeClassId, group_id: safeGroupId },
        { onConflict: "class_id,group_id" }
      );

    if (error) throw new Error("No pudimos habilitar el grupo.");
    return;
  }

  const { error } = await supabase
    .from("class_groups")
    .delete()
    .eq("class_id", safeClassId)
    .eq("group_id", safeGroupId);

  if (error) throw new Error("No pudimos quitar el grupo.");
}

export async function setClassStudentOverride(
  classId: string,
  profileId: string,
  allowed: boolean | null
): Promise<void> {
  const supabase = await getSupabase();
  const safeClassId = validateUuid(classId, "Clase inválida.");
  const safeProfileId = validateUuid(profileId, "Alumna inválida.");

  if (allowed === null) {
    const { error } = await supabase
      .from("class_student_access")
      .delete()
      .eq("class_id", safeClassId)
      .eq("profile_id", safeProfileId);

    if (error) throw new Error("No pudimos restablecer el permiso heredado.");
    return;
  }

  const { error } = await supabase
    .from("class_student_access")
    .upsert(
      {
        class_id: safeClassId,
        profile_id: safeProfileId,
        allowed,
        updated_at: new Date().toISOString()
      },
      { onConflict: "class_id,profile_id" }
    );

  if (error) throw new Error("No pudimos guardar la excepción individual.");
}

async function getSessionToken(): Promise<{
  token: string;
  supabase: Awaited<ReturnType<typeof getSupabase>>;
}> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    window.location.replace("/alumnos?reason=expired");
    throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
  }

  return { token, supabase };
}

async function readPlaybackResponse(
  response: Response,
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  unavailableMessage: string
): Promise<string> {
  const payload = await response.json().catch(() => ({})) as {
    url?: string;
    error?: string;
  };

  if (response.status === 401) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.replace("/alumnos?reason=expired");
    throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
  }

  if (response.status === 403) throw new Error("No tenés permisos para reproducir esta clase.");
  if (response.status === 404) throw new Error(unavailableMessage);
  if (response.status === 503) throw new Error("El servicio de video no está disponible.");

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? unavailableMessage);
  }

  return payload.url;
}

export async function getAdminPlaybackUrl(classId: string): Promise<string> {
  const { token, supabase } = await getSessionToken();

  const response = await fetch(
    `/api/admin/classes/${encodeURIComponent(validateUuid(classId, "Clase inválida."))}/playback`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  return readPlaybackResponse(
    response,
    supabase,
    "No pudimos abrir la vista previa de la clase."
  );
}

export async function deleteClassAndVideo(
  classId: string
): Promise<{ video: "deleted" | "missing" }> {
  const { token, supabase } = await getSessionToken();

  const response = await fetch(
    `/api/admin/classes/${encodeURIComponent(validateUuid(classId, "Clase inválida."))}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  const payload = await response.json().catch(() => ({})) as {
    error?: string;
    deleted?: { class?: boolean; video?: "deleted" | "missing" };
  };

  if (response.status === 401) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.replace("/alumnos?reason=expired");
    throw new Error("Tu sesión terminó. Volvé a iniciar sesión.");
  }

  if (response.status === 403) throw new Error("No tenés permisos para eliminar clases.");
  if (response.status === 404) throw new Error("La clase ya no existe.");
  if (response.status === 503) throw new Error("La eliminación de videos no está disponible.");

  if (!response.ok || !payload.deleted?.class || !payload.deleted.video) {
    throw new Error(payload.error ?? "No pudimos eliminar la clase y su video.");
  }

  return { video: payload.deleted.video };
}

export async function getPlaybackUrl(classId: string): Promise<string> {
  const { token, supabase } = await getSessionToken();

  const response = await fetch(
    `/api/classes/${encodeURIComponent(validateUuid(classId, "Clase inválida."))}/playback`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  return readPlaybackResponse(
    response,
    supabase,
    "Esta clase no está disponible para tu cuenta."
  );
}

function classImage(category: string): string {
  const value = category.toLowerCase();
  if (value.includes("movilidad")) return "/images/classes/movilidad-total.jpg";
  if (value.includes("fuerza")) return "/images/classes/fuerza-control.jpg";
  if (value.includes("quick") || value.includes("energ")) return "/images/classes/energia-20.jpg";
  return "/images/classes/pilates-maleta.jpg";
}
