"use client";
import { PhotoCredit } from "@/components/photo-credit";
import { useEffect, useState } from "react";
type Photo = { id: string; guestName: string; imageUrl: string; createdAt: string };

export function AdminWeddingUploads({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/host/uploads?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { photos?: Photo[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load uploads.");
        if (!stopped) { setPhotos(data.photos ?? []); setError(""); }
      } catch (caught) { if (!stopped) setError(caught instanceof Error ? caught.message : "Could not load uploads."); }
      finally { if (!stopped) { setLoading(false); timer = setTimeout(load, 5000); } }
    }
    void load();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [eventId]);
  return <section className="panel bg-paper p-5 lg:col-span-full">
    <h2 className="font-serif text-3xl">Uploaded photos <span className="text-lg text-ink/50">({photos.length})</span></h2>
    <p className="mt-2 text-sm text-ink/60">Photos shared through the Uploads page after the competition closes.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
    {loading ? <p className="mt-6 text-sm text-ink/60">Loading uploads…</p> : !photos.length ? <p className="mt-6 text-sm text-ink/60">No additional photos uploaded yet.</p> : <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-4">{photos.map((photo) => <article key={photo.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-forest/10 bg-white"><a href={photo.imageUrl} target="_blank" rel="noreferrer" aria-label={`Open photo sent by ${photo.guestName}`}><img src={photo.imageUrl} alt={`Photo sent by ${photo.guestName}`} loading="lazy" className="w-full" /></a><p className="p-3 text-sm"><PhotoCredit name={photo.guestName} createdAt={photo.createdAt} /></p></article>)}</div>}
  </section>;
}
