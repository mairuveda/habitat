import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listVisibleClasses, type PilatesClass } from "@/lib/classes";

const demoClasses: PilatesClass[] = [
  { id: "maleta", title: "Pilates en tu Maleta", description: "Rutina completa para mantenerte en movimiento", duration: 25, level: "Intermedio", category: "Viajes", image: "/images/classes/pilates-maleta.jpg" },
  { id: "movilidad", title: "Movilidad Total", description: "Libera tensiones y mejora tu rango de movimiento", duration: 35, level: "Todos", category: "Movilidad", image: "/images/classes/movilidad-total.jpg" },
  { id: "energia", title: "Energía en 20", description: "Sesión rápida para activar cuerpo y mente", duration: 20, level: "Principiante", category: "Quick Flow", image: "/images/classes/energia-20.jpg" },
  { id: "fuerza", title: "Fuerza y Control", description: "Fortalece tu centro y tonifica", duration: 40, level: "Intermedio", category: "Fuerza", image: "/images/classes/fuerza-control.jpg" },
  { id: "caderas", title: "Caderas Libres", description: "Movilidad profunda para caderas y espalda baja", duration: 30, level: "Todos", category: "Movilidad", image: "/images/classes/caderas-libres.jpg" },
  { id: "hotel", title: "Hotel Room Flow", description: "Rutina sin equipo para espacios pequeños", duration: 25, level: "Principiante", category: "Viajes", image: "/images/classes/hotel-room-flow.jpg" }
];

export default function ClassLibrary() {
  const [items, setItems] = useState<PilatesClass[]>(demoClasses);
  const [duration, setDuration] = useState("all");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PilatesClass | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listVisibleClasses()
      .then((classes) => {
        if (classes.length > 0) setItems(classes);
      })
      .catch(() => setStatus("No pudimos cargar la biblioteca online. Mostramos el contenido de demostración."));
  }, []);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);
  const visible = useMemo(() => items.filter((item) => {
    const durationOk = duration === "all" || (duration === "short" ? item.duration <= 25 : item.duration > 25);
    const levelOk = level === "all" || item.level === level || item.level === "Todos";
    const categoryOk = category === "all" || item.category === category;
    const searchOk = item.title.toLowerCase().includes(search.toLowerCase());
    return durationOk && levelOk && categoryOk && searchOk;
  }), [items, duration, level, category, search]);

  return (
    <div className="library">
      <div className="library-toolbar">
        <div className="filters">
          <select aria-label="Duración" value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="all">Duración</option><option value="short">Hasta 25 min</option><option value="long">Más de 25 min</option>
          </select>
          <select aria-label="Nivel" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">Nivel</option><option>Principiante</option><option>Intermedio</option>
          </select>
          <select aria-label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Categoría</option>{categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => { setDuration("all"); setLevel("all"); setCategory("all"); setSearch(""); }}>Limpiar filtros</button>
        </div>
        <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clases..." aria-label="Buscar clases" />
      </div>
      {status && <p className="library-status">{status}</p>}
      <h2>Explora nuestra biblioteca</h2>
      <div className="class-cards">
        {visible.map((item) => (
          <button className="class-card" key={item.id} type="button" onClick={() => setSelected(item)}>
            <div className="thumb-wrap">
              <img src={item.image} alt="" />
              <span className="duration">{item.duration || "—"} min</span>
              <span className="category">{item.category}</span>
            </div>
            <div className="class-body">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span>Nivel: {item.level}</span>
            </div>
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="empty">No encontramos clases con esos filtros.</p>}

      {selected && (
        <div className="player-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="player-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(event) => event.stopPropagation()}>
            <button className="player-close" type="button" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
            <div className="player-frame">
              {selected.playbackUrl ? (
                <video controls playsInline preload="metadata" src={selected.playbackUrl} />
              ) : (
                <div className="player-placeholder"><span>▶</span><strong>{selected.title}</strong><p>El reproductor queda activo al cargar el primer video real desde Administración.</p></div>
              )}
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
          </section>
        </div>
      )}
    </div>
  );
}
