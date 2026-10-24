"use client";
import { Camera } from "lucide-react";
import { useState, type FormEvent } from "react";

type Item = { file: File; status: "ready" | "uploading" | "done" | "error"; error?: string };

export function WeddingUploads() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const guestName = String(new FormData(event.currentTarget).get("guestName") ?? "");
    setBusy(true);
    const queue = [...items];
    for (let index = 0; index < queue.length; index++) {
      if (queue[index].status === "done") continue;
      queue[index] = { ...queue[index], status: "uploading", error: undefined }; setItems([...queue]);
      try {
        const form = new FormData(); form.set("guestName", guestName); form.set("photo", queue[index].file);
        const response = await fetch("/api/uploads", { method: "PUT", body: form });
        const data = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(data?.error ?? `Upload failed (${response.status}). Please retry.`);
        queue[index] = { ...queue[index], status: "done" };
      } catch (caught) { queue[index] = { ...queue[index], status: "error", error: caught instanceof Error ? caught.message : "Upload failed." }; }
      setItems([...queue]);
    }
    setBusy(false);
  }

  return <section className="mx-auto w-full max-w-2xl px-4 py-12 text-left sm:px-7">
    <h1 className="font-serif text-4xl">Upload photos</h1>
    <p className="mt-3 text-ink/70">Add as many photos as you like. These memories are separate from the category competition and do not affect winners.</p>
    <form onSubmit={upload} className="mt-7 w-full space-y-5 rounded-3xl border border-[#bfd1c3] bg-[#f1f6f2] p-6">
      <div><label className="field-label" htmlFor="upload-name">Your name</label><input id="upload-name" name="guestName" className="field" required maxLength={50} disabled={busy} /></div>
      <label className={`relative grid min-h-64 place-items-center rounded-3xl border-2 border-dashed border-[#bfd1c3] bg-[#e7efe9] p-6 text-center transition focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-forest ${busy ? "opacity-60" : "cursor-pointer hover:border-forest/50 hover:bg-[#dce8df]"}`}>
        <input id="wedding-photos" aria-label="Upload photos" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => setItems(Array.from(e.target.files ?? []).map((file) => ({ file, status: "ready" })))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" />
        <span className="pointer-events-none"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-forest text-[#f1f6f2]"><Camera className="h-7 w-7" /></span><span className="mt-5 block text-lg font-bold">Upload photos</span><span className="mt-2 block text-sm text-ink/60">JPEG, PNG or WebP</span><span className="mt-2 block text-xs text-ink/60">{items.length ? `${items.length} photos selected · tap to change` : "Choose one or multiple photos"}</span></span>
      </label>
      <button className="button button-dark disabled:opacity-50" disabled={busy || !items.some((item) => item.status !== "done")}>{busy ? "Uploading…" : items.some((item) => item.status === "error") ? "Retry failed photos" : "Upload photos"}</button>
      {!!items.length && <div aria-live="polite" className="max-h-64 space-y-2 overflow-y-auto text-sm"><p>{items.filter((item) => item.status === "done").length} of {items.length} uploaded</p>{items.map((item, index) => <p key={index} className={item.status === "error" ? "text-red-800" : "text-ink/70"}>{item.file.name} — {item.error ?? item.status}</p>)}</div>}
    </form>
  </section>;
}
