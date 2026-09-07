"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

type Photo = {
  id: string;
  signedUrl: string | null;
  caption: string | null;
  created_at: string;
};

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const visible = photos.filter((photo) => photo.signedUrl);
  const [selected, setSelected] = useState<Photo | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected]);

  if (!visible.length) return null;

  return (
    <>
      <div className="photo-grid">
        {visible.map((photo) => (
          <button
            key={photo.id}
            className="photo-card photo-open-button"
            type="button"
            onClick={() => setSelected(photo)}
            aria-label="Xem ảnh lớn"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.signedUrl!}
              alt={photo.caption || "Ảnh hiện trường"}
              loading="lazy"
              decoding="async"
            />
            <span className="photo-zoom-hint"><Maximize2 size={16} /> Xem ảnh</span>
            {photo.caption ? <span className="photo-caption">{photo.caption}</span> : null}
          </button>
        ))}
      </div>

      {selected?.signedUrl ? (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Ảnh hiện trường" onClick={() => setSelected(null)}>
          <button className="photo-lightbox-close" type="button" onClick={() => setSelected(null)} aria-label="Đóng ảnh">
            <X size={24} />
          </button>
          <div className="photo-lightbox-content" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.signedUrl} alt={selected.caption || "Ảnh hiện trường"} decoding="async" />
            {selected.caption ? <div className="photo-lightbox-caption">{selected.caption}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
