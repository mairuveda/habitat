import { useEffect, useMemo, useState } from "react";
import {
  getPlaybackUrl,
  listVisibleClasses,
  type PilatesClass
} from "@/lib/classes";

type ClassCardProps = {
  item: PilatesClass;
  classNumber: number;
  onOpen: (item: PilatesClass) => void;
};

function numberLabel(value: number): string {
  return String(value).padStart(2, "0");
}

function classDescription(item: PilatesClass): string {
  const description = item.description.trim();
  if (description) return description;

  return "Práctica disponible para tu cuenta.";
}

function ClassCard({ item, classNumber, onOpen }: ClassCardProps) {
  return (
    <button
      className="class-card"
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`Abrir clase ${classNumber}: ${item.title}`}
    >
      <div className="class-cover">
        <span className="class-number">Clase {numberLabel(classNumber)}</span>
      </div>

      <div className="class-body">
        <p className="class-description">{classDescription(item)}</p>

        <div className="class-meta">
          <span>{item.duration || "—"} min</span>
          <span>{item.level}</span>
          <span>{item.category}</span>
        </div>

        <strong className="class-open">Ver clase →</strong>
      </div>
    </button>
  );
}

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

  const levels = useMemo(
    () => Array.from(
      new Set(
        items
          .map((item) => item.level)
          .filter((item) => item !== "Todos")
      )
    ),
    [items]
  );

  const durationBuckets = useMemo(() => ({
    short: items.some((item) => item.duration <= 25),
    long: items.some((item) => item.duration > 25)
  }), [items]);

  const showSearch = items.length >= 6;
  const showDurationFilter = durationBuckets.short && durationBuckets.long;
  const showLevelFilter = levels.length > 1;
  const showCategoryFilter = categories.length > 1;
  const showToolbar = showSearch
    || showDurationFilter
    || showLevelFilter
    || showCategoryFilter;

  const hasActiveFilters = duration !== "all"
    || level !== "all"
    || category !== "all"
    || search.trim() !== "";

  const visible = useMemo(
    () => items.filter((item) => {
      const durationOk = duration === "all"
        || (duration === "short" ? item.duration <= 25 : item.duration > 25);
      const levelOk = level === "all"
        || item.level === level
        || item.level === "Todos";
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
    <div className="library">
      {status && <p className="library-status" role="status">{status}</p>}

      {showToolbar && !loading && (
        <div className="library-toolbar">
          <div className="filters">
            {showDurationFilter && (
              <select
                aria-label="Duración"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="all">Duración</option>
                <option value="short">Hasta 25 min</option>
                <option value="long">Más de 25 min</option>
              </select>
            )}

            {showLevelFilter && (
              <select
                aria-label="Nivel"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="all">Nivel</option>
                {levels.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            )}

            {showCategoryFilter && (
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
            )}

            {hasActiveFilters && (
              <button type="button" onClick={clearFilters}>
                Limpiar
              </button>
            )}
          </div>

          {showSearch && (
            <input
              className="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clases..."
              aria-label="Buscar clases"
            />
          )}
        </div>
      )}

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
              {items.length === 0
                ? "Todavía no hay clases publicadas para tu grupo."
                : "No encontramos clases con esos filtros."}
            </p>
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
            aria-label={`Clase ${selectedNumber ?? ""}`}
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
                Clase {numberLabel(selectedNumber)}
              </span>
            )}

            <p className="player-description">
              {classDescription(selected)}
            </p>

            <div className="player-meta">
              <span>{selected.duration || "—"} min</span>
              <span>{selected.level}</span>
              <span>{selected.category}</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
