import { useEffect, useState } from "react";
import { getAdminPlaybackUrl, type AdminPilatesClass } from "@/lib/classes";

type Props = {
  item: AdminPilatesClass;
  onClose: () => void;
};

export default function AdminClassPreviewDialog({ item, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAdminPlaybackUrl(item.id)
      .then((value) => {
        if (!cancelled) setUrl(value);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No pudimos abrir la vista previa."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="admin-modal admin-video-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>

        <div className="preview-heading">
          <span className={item.published ? "status-pill active" : "status-pill"}>
            {item.published ? "Publicada" : "Pausada"}
          </span>
          <h2 id="admin-preview-title">{item.title}</h2>
        </div>

        <div className="admin-preview-frame">
          {url ? (
            <video controls playsInline preload="metadata" src={url} />
          ) : (
            <div className="admin-preview-placeholder">
              {status ?? "Preparando vista previa…"}
            </div>
          )}
        </div>

        <div className="preview-meta">
          <span>{item.duration || "—"} min</span>
          <span>{item.level}</span>
          <span>{item.category}</span>
        </div>

        {item.description && (
          <p className="preview-description">{item.description}</p>
        )}
      </section>
    </div>
  );
}
