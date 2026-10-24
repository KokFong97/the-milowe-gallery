"use client";
import { useState, type FormEvent } from "react";
import type { EventSnapshot } from "@/lib/millowe-types";

export function SlideshowSettings({ snapshot, onUpdate }: { snapshot: EventSnapshot; onUpdate: (snapshot: EventSnapshot) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const endpoint = `/api/host/events/${snapshot.event.id}/slideshow`;
  async function request(method: string, body: FormData | object) {
    const response = await fetch(endpoint, { method, headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body instanceof FormData ? body : JSON.stringify(body) });
    const data = await response.json().catch(() => null) as (EventSnapshot & { error?: string }) | null;
    if (!response.ok || !data) throw new Error(data?.error ?? `Could not update slideshow (${response.status}).`);
    onUpdate(data);
  }
  async function saveSeconds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await request("PATCH", { seconds: Number(new FormData(event.currentTarget).get("seconds")) }); setNotice("Slideshow timing saved."); }
    catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }
  async function addPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const files = new FormData(form).getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
    setBusy(true); setError(""); setNotice("");
    let added = 0;
    try {
      for (const file of files) { const data = new FormData(); data.set("photo", file); await request("PUT", data); added++; setNotice(`Added ${added} of ${files.length} photos.`); }
      form.reset();
    } catch (caught) { setError(`${(caught as Error).message} ${added} photos were added successfully.`); }
    finally { setBusy(false); }
  }
  async function remove(photoId: string) {
    if (!window.confirm("Remove this photo from the live-wall slideshow? The original file will be kept in storage.")) return;
    setBusy(true); setError(""); setNotice("");
    try { await request("DELETE", { photoId }); setNotice("Removed from the slideshow. Original file retained."); }
    catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }
  return <section className="panel bg-paper p-5">
    <h2 className="field-label">Live-wall slideshow</h2>
    <p className="mb-4 text-xs leading-5 text-ink/60">These photos play during Submission, in the order below.</p>
    <form onSubmit={saveSeconds} className="flex items-end gap-2"><div className="min-w-0 flex-1"><label htmlFor="slide-seconds" className="field-label">Seconds per photo</label><input key={snapshot.slideshow.seconds} id="slide-seconds" name="seconds" type="number" min={1} max={3600} step={1} required defaultValue={snapshot.slideshow.seconds} disabled={busy} className="field" /></div><button disabled={busy} className="button button-dark !min-h-11 !px-4">Save</button></form>
    <div className="mt-5 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto">{snapshot.slideshow.photos.map((photo, index) => <div key={photo.id} className="overflow-hidden rounded-xl border border-forest/10 bg-white"><img src={photo.url} alt={`Slideshow photo ${index + 1}`} className="aspect-square w-full object-cover" /><button disabled={busy} onClick={() => remove(photo.id)} className="w-full p-2 text-xs font-bold text-red-800">Remove photo {index + 1}</button></div>)}</div>
    {!snapshot.slideshow.photos.length && <p className="mt-4 text-sm text-ink/60">No slideshow photos. Add some below.</p>}
    <form onSubmit={addPhotos} className="mt-5 space-y-3"><label htmlFor="slideshow-files" className="field-label">Add photos</label><input id="slideshow-files" name="photos" type="file" multiple required accept="image/jpeg,image/png,image/webp" disabled={busy} className="w-full text-xs" /><button disabled={busy} className="button button-dark w-full !min-h-10 text-sm">{busy ? "Saving…" : "Add to slideshow"}</button></form>
    {notice && <p role="status" className="mt-3 text-xs text-forest">{notice}</p>}{error && <p role="alert" className="mt-3 text-xs text-red-800">{error}</p>}
  </section>;
}
