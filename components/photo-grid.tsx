type Photo = {
  id: string;
  signedUrl: string | null;
  caption: string | null;
  created_at: string;
};

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const visible = photos.filter((photo) => photo.signedUrl);
  if (!visible.length) return null;

  return (
    <div className="photo-grid">
      {visible.map((photo) => (
        <figure key={photo.id} className="photo-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.signedUrl!} alt={photo.caption || "Ảnh hiện trường"} />
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}
