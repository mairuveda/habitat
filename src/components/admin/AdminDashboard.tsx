import { useMemo, useState, type FormEvent } from "react";
import CloudinaryUpload from "./CloudinaryUpload";
import { createClass } from "@/lib/classes";
import { isSupabaseConfigured } from "@/lib/supabase";

const students = [
  ["Camila Torres", "Viajeras", true],
  ["María Gómez", "Mat Mañana", true],
  ["Laura Pérez", "Fuerza & Flow", true],
  ["Sofía Morales", "Movilidad Total", false],
  ["Valentina Ruiz", "Pilates Essentials", true]
] as const;

type Uploaded = {
  public_id: string;
  secure_url: string;
  duration?: number;
  thumbnail_url?: string;
};

export default function AdminDashboard() {
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stats = useMemo(() => [
    ["Estudiantes activos", "68"],
    ["Clases disponibles", "42"],
    ["Asignaciones activas", "18"],
    ["Visualizaciones (30 días)", "1.248"]
  ], []);

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const form = new FormData(event.currentTarget);

    if (!uploaded) {
      setStatus("Primero cargá el video.");
      return;
    }

    if (!isSupabaseConfigured) {
      setStatus("La interfaz ya funciona. Conectá Supabase para persistir la clase.");
      return;
    }

    setSaving(true);
    try {
      await createClass({
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "Viajes"),
        level: String(form.get("level") ?? "Todos"),
        durationMinutes: uploaded.duration ? Math.max(1, Math.round(uploaded.duration / 60)) : undefined,
        videoProvider: "cloudinary",
        videoRef: uploaded.public_id,
        playbackUrl: uploaded.secure_url,
        thumbnailUrl: uploaded.thumbnail_url,
        published: true
      });
      setStatus("Clase publicada. Ya puede aparecer en la biblioteca de alumnas autorizadas.");
      event.currentTarget.reset();
      setUploaded(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos guardar la clase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-main">
      <div className="admin-title"><div><h1>Dashboard</h1><p>Gestioná tu estudio de forma simple y efectiva.</p></div><button>+ Nueva clase</button></div>
      <div className="stats">{stats.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="admin-grid">
        <form className="panel upload-panel" onSubmit={saveClass}>
          <h2>Subir nueva clase</h2>
          <CloudinaryUpload onUploaded={setUploaded} />
          <label>Título<input name="title" placeholder="Ej: Pilates en tu Maleta" required /></label>
          <div className="form-row"><label>Categoría<select name="category"><option>Viajes</option><option>Movilidad</option><option>Quick Flow</option><option>Fuerza</option></select></label><label>Nivel<select name="level"><option>Principiante</option><option>Intermedio</option><option>Todos</option></select></label></div>
          <div className="video-state">{uploaded ? `✓ ${uploaded.public_id}` : "Video pendiente"}</div>
          <button className="save" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar clase"}</button>
          {status && <p className="saved" role="status">{status}</p>}
        </form>

        <section className="panel students"><div className="panel-heading"><h2>Estudiantes</h2><input placeholder="Buscar estudiante..." /></div><div className="student-table"><div className="row head"><span>Nombre</span><span>Grupo</span><span>Estado</span></div>{students.map(([name, group, active]) => <div className="row" key={name}><span>{name}</span><span>{group}</span><span><i className={active ? "dot active" : "dot"}></i>{active ? "Activo" : "Inactivo"}</span></div>)}</div><a href="#">Ver todos los estudiantes →</a></section>

        <section className="panel assign"><h2>Asignar a grupos</h2><label>Seleccioná una clase<select><option>Pilates en tu Maleta</option><option>Movilidad Total</option></select></label><label>Seleccioná grupos<div className="chips"><span>Viajeras ×</span><span>Pilates Essentials ×</span></div></label><label>Mensaje opcional<textarea defaultValue="¡Nueva clase disponible para que sigas fluyendo en movimiento!" /></label><button className="save">Asignar clase</button></section>
      </div>
    </div>
  );
}
