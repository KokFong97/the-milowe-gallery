"use client";

import { PhotoCredit } from "@/components/photo-credit";
import { useEffect, useRef, useState } from "react";
import { CategoryPhotoWall } from "@/components/category-photo-wall";
import { defaultSlideshowPhotos } from "@/lib/slideshow";
import QRCode from "qrcode";
import { Camera, Heart, ScanLine, Trophy } from "lucide-react";
import type { EventSnapshot } from "@/lib/millowe-types";


export function LiveWall({ code }: { code?: string }) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [wallSpotlight, setWallSpotlight] = useState<EventSnapshot["spotlight"]>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const updatesRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [qr, setQr] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [photoIndex, setPhotoIndex] = useState(0);
  const eventEndpoint = code ? `/api/events/${code}` : "/api/event";

  const weddingPhotos = snapshot?.slideshow.photos ?? defaultSlideshowPhotos;
  const slideSeconds = snapshot?.slideshow.seconds ?? 5;
  const photoListKey = weddingPhotos.map((photo) => photo.id).join("|");
  useEffect(() => {
    setPhotoIndex(0);
    if (weddingPhotos.length < 2) return;
    const rotate = window.setInterval(() => setPhotoIndex((index) => (index + 1) % weddingPhotos.length), slideSeconds * 1000);
    return () => window.clearInterval(rotate);
  }, [photoListKey, slideSeconds]);

  useEffect(() => {
    void QRCode.toDataURL(`${window.location.origin}${snapshot && snapshot.event.status !== "collecting" ? "/submissions" : "/"}`, { width: 240, margin: 1, color: { dark: "#17291f", light: "#fbf8f1" } }).then(setQr).catch(() => {});
  }, [snapshot?.event.status]);

  useEffect(() => {
    let stopped = false;
    let seen: Set<string> | null = null;
    const highlightTimers = new Set<ReturnType<typeof setTimeout>>();
    setNewIds(new Set());
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(eventEndpoint, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Updates unavailable");
        const data = (await response.json()) as EventSnapshot;
        if (!stopped) {
          const arrivals = seen ? data.submissions.filter((item) => !seen!.has(item.id)).map((item) => item.id) : [];
          if (!seen) seen = new Set();
          data.submissions.forEach((item) => seen!.add(item.id));
          if (arrivals.length) {
            setNewIds((current) => new Set([...current, ...arrivals]));
            setPage(0);
            const highlightTimer = setTimeout(() => {
              setNewIds((current) => new Set([...current].filter((id) => !arrivals.includes(id))));
              highlightTimers.delete(highlightTimer);
            }, 10000);
            highlightTimers.add(highlightTimer);
          }
          setSnapshot(data);
          setError(false);
        }
      } catch {
        if (!stopped) setError(true);
      } finally {
        if (!stopped) timer = setTimeout(load, 3500);
      }
    }
    void load();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); highlightTimers.forEach(clearTimeout); };
  }, [eventEndpoint]);

  // Keep photo focus independent of the heavier gallery snapshot poll.
  useEffect(() => {
    setWallSpotlight(null);
    if (!snapshot || snapshot.event.status !== "judging") return;
    const eventId = snapshot.event.id;
    const endpoint = `/api/events/${encodeURIComponent(snapshot.event.code)}/spotlight`;
    let stopped = false;
    let pending = false;
    let requested = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      if (stopped) return;
      if (pending) { requested = true; return; }
      clearTimeout(timer);
      pending = true;
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Preview unavailable");
        const data = await response.json() as { spotlight: EventSnapshot["spotlight"] };
        if (!stopped) setWallSpotlight(data.spotlight);
        failures = 0;
      } catch { failures++; }
      finally {
        pending = false;
        if (!stopped) {
          const delay = requested ? 0 : Math.min(500 * 2 ** failures, 5000);
          requested = false;
          timer = setTimeout(() => void refresh(), delay);
        }
      }
    }
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("milowe-spotlight") : null;
    if (channel) channel.onmessage = (message) => { if (message.data?.eventId === eventId) void refresh(); };
    void refresh();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); channel?.close(); };
  }, [snapshot?.event.id, snapshot?.event.code, snapshot?.event.status]);

  useEffect(() => {
    const node = updatesRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setCapacity(Math.max(1, Math.floor((node.clientHeight - 24) / 100))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const pages = Math.max(1, Math.ceil((snapshot?.submissions.length ?? 0) / capacity));
  useEffect(() => {
    setPage(0);
    const timer = setInterval(() => setPage((value) => (value + 1) % pages), 8000);
    return () => clearInterval(timer);
  }, [pages, capacity]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const recent = snapshot?.submissions.slice((page % pages) * capacity, ((page % pages) + 1) * capacity) ?? [];
  const spotlight = snapshot?.event.status === "judging" && wallSpotlight && wallSpotlight.expiresAt > now ? snapshot.submissions.find((photo) => photo.id === wallSpotlight.photoId) : null;
  const expanded = Boolean(snapshot && snapshot.event.status !== "collecting");
  const phase = snapshot?.event.status === "voting" ? "Guest voting" : snapshot?.event.status === "judging" ? "Judging" : "Closed";

  return (
    <main className="wall-display flex h-dvh min-h-0 flex-col overflow-hidden bg-[#101a15] p-4 text-cream sm:p-6 lg:p-7">
      <header className="mb-5 flex shrink-0 items-center justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">The Milowe Gallery</h1>
      </header>

      <div className={`wall-layout min-h-0 flex-1 ${expanded ? "wall-layout-expanded" : ""}`}>
        <section aria-label="Wedding photo slideshow" aria-hidden={expanded} className="wall-slideshow relative min-h-0 overflow-hidden rounded-3xl bg-black/30">
          {!weddingPhotos.length && <div className="grid h-full place-items-center p-8 text-center text-cream/60">Add slideshow photos in Admin to display them here.</div>}
          {weddingPhotos.map((photo, index) => (
            <img key={photo.id} src={photo.url} alt={`Wedding photograph ${index + 1}`} aria-hidden={index !== photoIndex} className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${index === photoIndex ? "opacity-100" : "opacity-0"}`} />
          ))}
        </section>

        <aside aria-label="Guest photo updates" className="wall-guest-panel relative min-h-0 min-w-0 overflow-hidden rounded-3xl border border-cream/10 bg-[#20362b]">
          <div className="wall-sidebar-content" aria-hidden={expanded} inert={expanded}>
          <div className="shrink-0 border-b border-cream/10 p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-sun"><span className={`h-2 w-2 rounded-full ${error ? "bg-sun" : "animate-pulse bg-[#99caa5]"}`} />{error ? "Reconnecting" : "LIVE SUBMISSIONS"}</p>
            <h2 className="mt-2 font-serif text-2xl">Just shared</h2>
            <p className="mt-1 text-xs text-cream/65">{snapshot ? `${snapshot.submissions.length} ${snapshot.submissions.length === 1 ? "moment" : "moments"} added to our story` : "Waiting for the latest moments…"}</p>
          </div>

          <div ref={updatesRef} className="min-h-0 flex-1 overflow-hidden p-4" aria-live="polite" aria-relevant="additions">
            {error && <p className="mb-4 text-xs leading-5 text-sun">Guest updates are temporarily unavailable. We’re reconnecting.</p>}
            {recent.length ? <div className="grid min-h-0 auto-rows-[92px] gap-2">{recent.map((submission) => {
              const category = snapshot?.categories.find((item) => item.id === submission.categoryId);
              return <article key={submission.id} className={`relative flex min-h-0 overflow-hidden gap-3 rounded-2xl border border-cream/10 bg-cream/[.06] p-3 ${newIds.has(submission.id) ? "wall-new-upload" : ""}`}>
                <img src={submission.imageUrl} alt={submission.caption || `Photo by ${submission.guestName}`} className="h-full w-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">{newIds.has(submission.id) && <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9e5d0] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#20362b]"><span className="h-1.5 w-1.5 rounded-full bg-[#427653]" />New photo</span>}<p className="text-[10px] font-bold uppercase tracking-wide text-sun">{category?.title ?? "Wedding moment"}</p><p className="mt-1 text-xs font-semibold"><PhotoCredit name={submission.guestName} createdAt={submission.createdAt} /></p><span className="mt-1 flex items-center gap-1 text-xs text-cream/70"><Heart className="h-3 w-3" />{submission.likeCount} likes</span>{submission.isWinner && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-sun"><Trophy className="h-3 w-3" /> Category favorite</span>}</div>
              </article>;
            })}</div> : <div className="grid min-h-48 place-items-center px-3 text-center"><div><Camera className="mx-auto h-7 w-7 text-sun" /><p className="mt-4 font-serif text-xl">Your view belongs here.</p><p className="mt-2 text-xs leading-6 text-cream/65">Guest photos will appear here with their photo missions.</p></div></div>}
          </div>

          <div className="flex shrink-0 items-center gap-4 border-t border-cream/10 bg-[#192d23] p-5">
            <div className="shrink-0 rounded-xl bg-[#fbf8f1] p-2">{qr ? <img src={qr} alt="Scan to open the wedding gallery" className="h-20 w-20" /> : <ScanLine className="h-20 w-20 p-4 text-forest" />}</div>
            <div><p className="font-serif text-xl">Add your view</p><p className="mt-2 text-xs leading-5 text-cream/65">Scan to explore the photo missions and guest gallery.</p></div>
          </div>
          </div>
          <div className="wall-expanded-content" aria-hidden={!expanded} inert={!expanded}>
            {snapshot && <>
      <header className="mb-5 flex shrink-0 items-center justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a4d2b1]">{phase}</p><h2 className="mt-1 font-serif text-3xl">Guest photos</h2><p className="mt-2 text-sm text-cream/65">{snapshot.event.status === "voting" ? "Scan to like your favorite moments." : snapshot.event.status === "judging" ? "Voting is closed - judging in progress" : "Voting is closed — enjoy everyone's favorite moments."}</p></div><div className="flex items-center gap-4">{qr && <img src={qr} alt="Scan to view submissions and vote" className="h-20 w-20 rounded-xl bg-cream p-1" />}</div></header>
      <CategoryPhotoWall snapshot={snapshot} />
            </>}
          </div>
          {spotlight && <div key={spotlight.id} className="wall-spotlight absolute inset-0 z-20 flex min-h-0 flex-col bg-[#172a20] p-6">
            <header className="mb-4 flex shrink-0 items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a4d2b1]">Judging • Photo in focus</p><h2 className="mt-1 font-serif text-2xl">{snapshot?.categories.find((category) => category.id === spotlight.categoryId)?.title}</h2></div><span className="flex items-center gap-2"><Heart className="h-5 w-5" />{spotlight.likeCount}</span></header>
            <img src={spotlight.imageUrl} alt={spotlight.caption || `Photo by ${spotlight.guestName}`} className="min-h-0 w-full flex-1 object-contain" />
            <footer className="mt-4 shrink-0 text-center"><PhotoCredit name={spotlight.guestName} createdAt={spotlight.createdAt} />{spotlight.caption && <p className="mt-2 line-clamp-2 text-cream/75">{spotlight.caption}</p>}</footer>
          </div>}
        </aside>
      </div>
    </main>
  );
}
