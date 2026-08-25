import { useEffect, useMemo, useState } from "react";
import { getPlaybackUrl, listVisibleClasses, type PilatesClass } from "@/lib/classes";

export default function ClassLibrary() {
  const [items, setItems] = useState<PilatesClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState("all");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PilatesClass | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listVisibleClasses()
      .then((classes) => {
        if (!cancelled) setItems(classes);
      })
      .catch(() => {
        if (!cancelled) setStatus("No pudimos cargar las clases. Intentá nuevamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);
  const visible = useMemo(() => items.filter((item) => {
    const durationOk = duration === "all" || (duration === "short" ? item.duration <= 25 : item.duration > 25);
    const levelOk = level === "all" || item.level === level || item.level === "Todos";
    const categoryOk = category === "all" || item.category === category;
    const searchOk = item.title.toLowerCase().includes(search.toLowerCase());
    return durationOk && levelOk && categoryOk && searchOk;
  }), [items, duration, level, category, search]);

  async function openClass(item: PilatesClass) {
    setSelected(item);
    setPlaybackUrl(null);
    setPlaybackLoading(true);
    setStatus(null);
    try {
      setPlaybackUrl(await getPlaybackUrl(item.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos abrir el video.");
    } finally {
      setPlaybackLoading(false);
    }
  }

  function closePlayer() {
    setSelected(null);
    setPlaybackUrl(null);
    setPlaybackLoading(false);
  }

  return (
    <div className="library">
      <div className="library-toolbar">
        <div className="filters">
          <select aria-label="Duración" value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="all">Duración</option><option value="short">Hasta 25 min</option><option value="long">Más de 25 min</option>
          </select>
          <select aria-label="Nivel" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">Nivel</option><option>Principiante</option><option>Intermedio</option>
          </select>
          <select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Categoría</option>{categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => { setDuration("all"); setLevel("all"); setCategory("all"); setSearch(""); }}>Limpiar filtros</button>
        </div>
        <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar clases..." aria-label="Buscar clases" />
      </div>
      {status && <p className="library-status">{status}</p>}
      <h2>Explora nuestra biblioteca</h2>
      {loading ? <p className="empty">Cargando clases…</p> : (
        <>
          <div className="class-cards">
            {visible.map((item) => (
              <button className="class-card" key={item.id} type="button" onClick={() => void openClass(item)}>
                <div className="thumb-wrap">
                  <img src={item.image} alt="" />
                  <span className="duration">{item.duration || "—"} min</span>
                  <span className="category">{item.category}</span>
                </div>
                <div className="class-body"><h3>{item.title}</h3><p>{item.description}</p><span>Nivel: {item.level}</span></div>
              </button>
            ))}
          </div>
          {visible.length === 0 && <p className="empty">Todavía no hay clases publicadas para tu grupo.</p>}
        </>
      )}

      {selected && (
        <div className="player-backdrop" role="presentation" onClick={closePlayer}>
          <section className="player-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(event) => event.stopPropagation()}>
            <button className="player-close" type="button" onClick={closePlayer} aria-label="Cerrar">×</button>
            <div className="player-frame">
              {playbackLoading ? (
                <div className="player-placeholder"><span>…</span><strong>Preparando clase</strong></div>
              ) : playbackUrl ? (
                <video key={playbackUrl} controls playsInline preload="metadata" src={playbackUrl} />
              ) : (
                <div className="player-placeholder"><span>!</span><strong>No pudimos abrir el video</strong><p>Verificá tu acceso o intentá nuevamente.</p></div>
              )}
            </div>
            <h3>{selected.title}</h3><p>{selected.description}</p>
          </section>
        </div>
      )}
    </div>
  );
}
