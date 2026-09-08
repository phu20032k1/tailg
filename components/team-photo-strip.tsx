"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

type TeamPhoto = {
  id: string;
  signedUrl: string | null;
  caption?: string | null;
};

export function TeamPhotoStrip({ photos }: { photos: TeamPhoto[] }) {
  const usable = photos.filter((photo) => Boolean(photo.signedUrl));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowLeft") setSelectedIndex((index) => index === null ? null : (index - 1 + usable.length) % usable.length);
      if (event.key === "ArrowRight") setSelectedIndex((index) => index === null ? null : (index + 1) % usable.length);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedIndex, usable.length]);

  if (!usable.length) return null;

  const firstTwo = usable.slice(0, 2);
  const remaining = Math.max(0, usable.length - 2);
  const selected = selectedIndex === null ? null : usable[selectedIndex];

  const viewer = mounted && selected?.signedUrl ? createPortal(
    <div className="team-photo-viewer" role="dialog" aria-modal="true" aria-label="Ảnh hiện trường của đội" onClick={() => setSelectedIndex(null)}>
      <button className="team-photo-viewer-close" type="button" onClick={() => setSelectedIndex(null)} aria-label="Đóng ảnh"><X size={24} /></button>
      {usable.length > 1 ? <button className="team-photo-viewer-nav prev" type="button" onClick={(event) => { event.stopPropagation(); setSelectedIndex((selectedIndex! - 1 + usable.length) % usable.length); }} aria-label="Ảnh trước"><ChevronLeft size={28} /></button> : null}
      <div className="team-photo-viewer-content" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selected.signedUrl} alt={selected.caption || "Ảnh hiện trường"} decoding="async" />
        <div className="team-photo-viewer-footer">
          <span><Images size={15} /> {selectedIndex! + 1}/{usable.length}</span>
          {selected.caption ? <strong>{selected.caption}</strong> : null}
        </div>
      </div>
      {usable.length > 1 ? <button className="team-photo-viewer-nav next" type="button" onClick={(event) => { event.stopPropagation(); setSelectedIndex((selectedIndex! + 1) % usable.length); }} aria-label="Ảnh tiếp theo"><ChevronRight size={28} /></button> : null}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="team-photo-strip" aria-label={`${usable.length} ảnh hiện trường`}>
        {firstTwo.map((photo, index) => (
          <button key={photo.id} className="team-photo-thumb" type="button" onClick={() => setSelectedIndex(index)} aria-label={`Xem ảnh ${index + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.signedUrl!} alt={photo.caption || `Ảnh hiện trường ${index + 1}`} loading="lazy" decoding="async" />
          </button>
        ))}
        {remaining > 0 ? (
          <button className="team-photo-thumb team-photo-more" type="button" onClick={() => setSelectedIndex(2)} aria-label={`Xem thêm ${remaining} ảnh`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={usable[2].signedUrl!} alt={usable[2].caption || "Xem thêm ảnh hiện trường"} loading="lazy" decoding="async" />
            <span>+{remaining}</span>
          </button>
        ) : null}
      </div>
      {viewer}
    </>
  );
}
