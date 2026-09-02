import { useEffect, useMemo, useState } from "react";
import {
  getPlaybackUrl,
  listVisibleClasses,
  type PilatesClass
} from "@/lib/classes";

type Props = {
  mode?: "summary" | "full";
  onViewAll?: () => void;
};

type ClassCardProps = {
  item: PilatesClass;
  classNumber: number;
  onOpen: (item: PilatesClass) => void;
};

function numberLabel(value: number): string {
  return String(value).padStart(2, "0");
}

function ClassCard({ item, classNumber, onOpen }: ClassCardProps) {
  const description = item.description.trim() || "Práctica disponible para tu cuenta.";

  return (
    <button
      className="class-card"
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`Abrir clase ${classNumber}: ${item.title}`}
    >
      <div className="class-cover">
        <span className="class-number">Clase {numberLabel(classNumber)}</span>

        <div className="class-cover-meta">
          <span>{item.category}</span>
          <span>{item.duration || "—"} min</span>
        </div>
      </div>

      <div className="class-body">
        <h3>{item.title}</h3>
        <p>{description}</p>

        <div className="class-card-footer">
          <span>Nivel: {item.level}</span>
          <strong>Ver clase →</strong>
        </div>
      </div>
    </button>
  );
}

export default function ClassLibrary({ mode = "full", onViewAll }: Props) {
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
        if (!cancelled) {
          setStatus("No pudimos cargar las clases. Intentá nuevamente.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const classNumbers = useMemo(
    () => new Map(
      items.map((item, index) => [item.id, items.length - index])
    ),
    [items]
  );

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items]
  );

  const visible = useMemo(
    () => items.filter((item) => {
      const durationOk = duration === "all"
        || (duration === "short" ? item.duration <= 25 : item.duration > 25);
      const levelOk = level === "all" || item.level === level || item.level === "Todos";
      const categoryOk = category === "all" || item.category === category;
      const normalizedSearch = search.trim().toLowerCase();
      const searchOk = !normalizedSearch
        || item.title.toLowerCase().includes(normalizedSearch)
        || item.description.toLowerCase().includes(normalizedSearch)
        || item.category.toLowerCase().includes(normalizedSearch);

      return durationOk && levelOk && categoryOk && searchOk;
    }),
    [items, duration, level, category, search]
  );

  const recent = items.slice(0, 3);

  async function openClass(item: PilatesClass) {
    setSelected(item);
    setPlaybackUrl(null);
    setPlaybackLoading(true);
    setStatus(null);

    try {
      setPlaybackUrl(await getPlaybackUrl(item.id));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "No pudimos abrir el video."
      );
    } finally {
      setPlaybackLoading(false);
    }
  }

  function closePlayer() {
    setSelected(null);
    setPlaybackUrl(null);
    setPlaybackLoading(false);
  }

  function clearFilters() {
    setDuration("all");
    setLevel("all");
    setCategory("all");
    setSearch("");
  }

  const selectedNumber = selected
    ? classNumbers.get(selected.id) ?? 1
    : null;

  return (
    <div className={mode === "summary" ? "library library-summary" : "library"}>
      {status && <p className="library-status" role="status">{status}</p>}

      {mode === "summary" ? (
        <>
          <section className="home-summary-card" aria-label="Resumen de clases">
            <div>
              <span>Clases disponibles para vos</span>
              <strong>{loading ? "—" : items.length}</strong>
            </div>
            <p>
              Accedé a las prácticas publicadas para tu grupo cuando quieras.
            </p>
          </section>

          <section className="home-recent">
            <div className="home-section-heading">
              <div>
                <h2>Clases recientes</h2>
                <p>Las últimas prácticas que se sumaron a tu espacio.</p>
              </div>

              <button
                className="view-all-classes"
                type="button"
                onClick={onViewAll}
              >
                Ver todas las clases
              </button>
            </div>

            {loading ? (
              <p className="empty">Cargando clases…</p>
            ) : (
              <>
                <div className="class-cards">
                  {recent.map((item) => (
                    <ClassCard
                      key={item.id}
                      item={item}
                      classNumber={classNumbers.get(item.id) ?? 1}
                      onOpen={openClass}
                    />
                  ))}
                </div>

                {recent.length === 0 && (
                  <p className="empty">
                    Todavía no hay clases publicadas para tu grupo.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="library-toolbar">
            <div className="filters">
              <select
                aria-label="Duración"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="all">Duración</option>
                <option value="short">Hasta 25 min</option>
                <option value="long">Más de 25 min</option>
              </select>

              <select
                aria-label="Nivel"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="all">Nivel</option>
                <option>Principiante</option>
                <option>Intermedio</option>
              </select>

              <select
                aria-label="Categoría"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Categoría</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <button type="button" onClick={clearFilters}>
                Limpiar filtros
              </button>
            </div>

            <input
              className="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clases..."
              aria-label="Buscar clases"
            />
          </div>

          <div className="library-heading">
            <h2>Todas tus clases</h2>
            {!loading && (
              <span>{visible.length} de {items.length}</span>
            )}
          </div>

          {loading ? (
            <p className="empty">Cargando clases…</p>
          ) : (
            <>
              <div className="class-cards">
                {visible.map((item) => (
                  <ClassCard
                    key={item.id}
                    item={item}
                    classNumber={classNumbers.get(item.id) ?? 1}
                    onOpen={openClass}
                  />
                ))}
              </div>

              {visible.length === 0 && (
                <p className="empty">
                  No encontramos clases con esos filtros.
                </p>
              )}
            </>
          )}
        </>
      )}

      {selected && (
        <div
          className="player-backdrop"
          role="presentation"
          onClick={closePlayer}
        >
          <section
            className="player-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="player-close"
              type="button"
              onClick={closePlayer}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="player-frame">
              {playbackLoading ? (
                <div className="player-placeholder">
                  <span>…</span>
                  <strong>Preparando clase</strong>
                </div>
              ) : playbackUrl ? (
                <video
                  key={playbackUrl}
                  controls
                  playsInline
                  preload="metadata"
                  src={playbackUrl}
                />
              ) : (
                <div className="player-placeholder">
                  <span>!</span>
                  <strong>No pudimos abrir el video</strong>
                  <p>Verificá tu acceso o intentá nuevamente.</p>
                </div>
              )}
            </div>

            {selectedNumber && (
              <span className="player-class-number">
                Clase {numberLabel(selectedNumber)} · {selected.category}
              </span>
            )}
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
          </section>
        </div>
      )}
    </div>
  );
}
