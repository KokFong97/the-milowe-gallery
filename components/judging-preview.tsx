"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PhotoCredit } from "@/components/photo-credit";
import type { MilloweSubmission } from "@/lib/millowe-types";

export function JudgingPreview({ eventId, photo, onClose }: { eventId: string; photo: MilloweSubmission; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState("Connecting to live wall…");
  useEffect(() => {
    dialog.current?.showModal();
    const token = crypto.randomUUID();
    const url = `/api/host/events/${eventId}/spotlight`;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const notify = () => {
      if (typeof BroadcastChannel === "undefined") return;
      const channel = new BroadcastChannel("milowe-spotlight");
      channel.postMessage({ eventId });
      channel.close();
    };
    const clear = () => fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), keepalive: true }).then((response) => { if (response.ok) notify(); }).catch(() => {});
    async function sync(claim = false) {
      try {
        const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, photoId: photo.id, claim }) });
        if (stopped) { void clear(); return; }
        if (!response.ok) { setStatus("Live-wall preview ended. Close and reopen to show it again."); return; }
        notify();
        setStatus("Sent to the live wall — close this preview to return to categories.");
      } catch { if (!stopped) setStatus("Connection interrupted. Retrying live-wall preview…"); }
      if (!stopped) timer = setTimeout(() => void sync(), 15000);
    }
    void sync(true);
    return () => { stopped = true; clearTimeout(timer); void clear(); };
  }, [eventId, photo.id]);

  return <dialog ref={dialog} onCancel={onClose} aria-label="Judging photo preview" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,94vw)] rounded-3xl bg-forest p-5 text-cream backdrop:bg-black/75">
    <div className="mb-4 flex items-center justify-between gap-4"><p className="text-sm text-cream/75" role="status">{status}</p><button autoFocus onClick={onClose} aria-label="Close preview" className="rounded-full bg-white/10 p-3 hover:bg-white/20"><X /></button></div>
    <img src={photo.imageUrl} alt={photo.caption || `Photo by ${photo.guestName}`} className="h-[65dvh] w-full object-contain" />
    <div className="mt-4"><PhotoCredit name={photo.guestName} createdAt={photo.createdAt} />{photo.caption && <p className="mt-2">{photo.caption}</p>}</div>
  </dialog>;
}
