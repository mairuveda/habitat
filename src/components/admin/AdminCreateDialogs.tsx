import { useState } from "react";
import CloudinaryUpload, { type UploadResult } from "./CloudinaryUpload";
import { createGroup, createStudent, type StudioGroup } from "@/lib/admin/students";
import { createClass } from "@/lib/classes";

type CommonProps = {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  onStatus: (message: string) => void;
};

type StudentDialogProps = CommonProps & {
  groups: StudioGroup[];
};

type ClassDialogProps = CommonProps & {
  groups: StudioGroup[];
};

export function NewStudentDialog({
  groups,
  onClose,
  onCreated,
  onStatus
}: StudentDialogProps) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  async function submitStudent(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    onStatus("");
    setTemporaryPassword(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const result = await createStudent({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? "") || undefined,
        groupId: String(form.get("groupId") ?? "") || null
      });

      formElement.reset();
      await onCreated();
      setTemporaryPassword(result.temporaryPassword ?? null);
      onStatus("Alumna creada correctamente.");

      if (!result.temporaryPassword) onClose();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "No pudimos crear la alumna.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onSubmit={submitStudent} onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <h2>Nueva alumna</h2>
        <p>Si dejás la contraseña vacía, generamos una temporal para copiar y enviar.</p>

        <label>
          Nombre completo
          <input name="fullName" required />
        </label>

        <label>
          Email
          <input name="email" type="email" required />
        </label>

        <label>
          Grupo
          <select name="groupId">
            <option value="">Sin grupo</option>
            {groups.filter((group) => group.active).map((group) => (
              <option value={group.id} key={group.id}>{group.name}</option>
            ))}
          </select>
        </label>

        <label>
          Contraseña temporal
          <input name="password" type="text" minLength={8} placeholder="Opcional" />
        </label>

        <button className="button full" type="submit">Crear alumna</button>

        {temporaryPassword && (
          <div className="temporary-password">
            <span>Contraseña generada</span>
            <strong>{temporaryPassword}</strong>
            <button type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}>
              Copiar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export function NewGroupDialog({ onClose, onCreated, onStatus }: CommonProps) {
  async function submitGroup(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    onStatus("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await createGroup(String(form.get("name") ?? ""));
      formElement.reset();
      await onCreated();
      onStatus("Grupo creado.");
      onClose();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "No pudimos crear el grupo.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="admin-modal small" onSubmit={submitGroup} onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <h2>Nuevo grupo</h2>
        <p>Creá el grupo y luego asigná alumnas desde su listado.</p>
        <label>
          Nombre
          <input name="name" placeholder="Ej: Viajeras" required />
        </label>
        <button className="button full" type="submit">Crear grupo</button>
      </form>
    </div>
  );
}

export function NewClassDialog({
  groups,
  onClose,
  onCreated,
  onStatus
}: ClassDialogProps) {
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitClass(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    onStatus("");

    if (!uploaded) {
      onStatus("Primero subí el video.");
      return;
    }

    if ((uploaded.type ?? "upload") !== "authenticated") {
      onStatus("Ese video no quedó privado. Revisá el preset de Cloudinary y volvé a subirlo.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const groupIds = form.getAll("groupIds").map(String).filter(Boolean);
    setSaving(true);

    try {
      await createClass({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? "Viajes"),
        level: String(form.get("level") ?? "Todos"),
        durationMinutes: uploaded.duration ? Math.max(1, Math.round(uploaded.duration / 60)) : undefined,
        videoProvider: "cloudinary",
        videoRef: uploaded.public_id,
        videoDeliveryType: "authenticated",
        videoFormat: uploaded.format,
        videoVersion: uploaded.version,
        published: true,
        groupIds
      });

      formElement.reset();
      setUploaded(null);
      await onCreated();
      onStatus(
        groupIds.length > 0
          ? "Clase publicada para los grupos seleccionados."
          : "Clase publicada para todas las alumnas activas."
      );
      onClose();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "No pudimos publicar la clase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="admin-modal class-modal" onSubmit={submitClass} onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <h2>Nueva clase</h2>
        <p>Subí desde tu equipo o Google Drive y elegí quién puede verla.</p>

        <CloudinaryUpload onUploaded={setUploaded} />

        <div className={uploaded?.type === "authenticated" ? "upload-security ok" : "upload-security"}>
          {uploaded ? `Video: ${uploaded.type ?? "upload"} · ${uploaded.format ?? "video"}` : "Video pendiente"}
        </div>

        <label>
          Título
          <input name="title" placeholder="Ej: Pilates en tu maleta" required />
        </label>

        <label>
          Descripción
          <textarea name="description" placeholder="Rutina ideal para viajes…" />
        </label>

        <div className="form-row">
          <label>
            Categoría
            <select name="category">
              <option>Viajes</option>
              <option>Movilidad</option>
              <option>Quick Flow</option>
              <option>Fuerza</option>
            </select>
          </label>
          <label>
            Nivel
            <select name="level">
              <option>Principiante</option>
              <option>Intermedio</option>
              <option>Todos</option>
            </select>
          </label>
        </div>

        <fieldset className="group-access">
          <legend>Disponible para</legend>
          <p>Sin seleccionar grupos, la clase queda disponible para todas las alumnas activas.</p>
          {groups.filter((group) => group.active).map((group) => (
            <label className="check-row" key={group.id}>
              <input type="checkbox" name="groupIds" value={group.id} />
              {group.name}
            </label>
          ))}
        </fieldset>

        <button className="button full" type="submit" disabled={saving}>
          {saving ? "Publicando…" : "Publicar clase"}
        </button>
      </form>
    </div>
  );
}
