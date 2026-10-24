"use client";

import { PhotoCredit } from "@/components/photo-credit";
import { WeddingUploads } from "@/components/wedding-uploads";
import { compareJudgingPhotos } from "@/lib/photo-ranking";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Heart,
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { MilloweLogo } from "@/components/millowe-logo";
import type { EventSnapshot, MilloweCategory } from "@/lib/millowe-types";

const iconMap = { Sparkles, Users, Image: ImageIcon, WandSparkles, Smile: Sparkles, Camera };

export function GuestEvent({ code, view = "missions", initialCategory = "all" }: { code?: string; view?: "missions" | "submissions" | "uploads"; initialCategory?: string }) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [liking, setLiking] = useState<string | null>(null);
  const [likeError, setLikeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [uploadCategory, setUploadCategory] = useState<MilloweCategory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [success, setSuccess] = useState<"approved" | "">("");
  const eventEndpoint = code ? `/api/events/${code}` : "/api/event";
  const uploadEndpoint = code
    ? `/api/events/${code}/submissions`
    : "/api/event/submissions";
  const guestNameKey = code ? `millowe-name-${code}` : "millowe-wedding-guest-name";

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(eventEndpoint, { cache: "no-store" });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not open this event.");
      setSnapshot(data);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open this event.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [eventEndpoint]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 4500);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const visible = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.submissions.filter((item) => activeCategory === "all" || item.categoryId === activeCategory).sort((a, b) => snapshot.event.status === "collecting" ? 0 : snapshot.event.status === "judging" ? compareJudgingPhotos(a, b) : b.likeCount - a.likeCount);
  }, [snapshot, activeCategory]);

  const winners = snapshot?.submissions.filter((item) => item.isWinner) ?? [];

  async function likePhoto(id: string, liked: boolean) {
    if (liking) return;
    setLiking(id);
    setLikeError("");
    try {
      const response = await fetch(`/api/submissions/${id}/like`, { method: liked ? "DELETE" : "POST" });
      const data = (await response.json()) as { error?: string; likeCount: number; likedByMe: boolean };
      if (!response.ok) throw new Error(data.error ?? "Could not like this photo.");
      setSnapshot((current) => current ? { ...current, submissions: current.submissions.map((photo) => photo.id === id ? { ...photo, likeCount: data.likeCount, likedByMe: data.likedByMe } : photo) } : current);
    } catch (caught) { setLikeError(caught instanceof Error ? caught.message : "Could not like this photo."); }
    finally { setLiking(null); }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : "");
    setUploadError("");
  }

  function openUpload(category: MilloweCategory) {
    setUploadCategory(category);
    setPhoto(null);
    setPreview("");
    setSuccess("");
    setUploadError("");
  }

  function closeUpload() {
    if (uploading) return;
    setUploadCategory(null);
    setPhoto(null);
    setSuccess("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
  }

  async function submitPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadCategory || !photo) {
      setUploadError("Choose a photograph first.");
      return;
    }
    setUploading(true);
    setUploadError("");
    const form = new FormData(event.currentTarget);
    form.set("categoryId", uploadCategory.id);
    form.set("photo", photo);
    try {
      const response = await fetch(uploadEndpoint, { method: "PUT", body: form });
      const data = (await response.json().catch(() => null)) as { submission?: { status: "approved" }; error?: string } | null;
      if (!response.ok) {
        throw new Error(response.status === 413
          ? "The hosting server could not accept this photo's size. Please try a smaller copy or contact the organizer."
          : data?.error ?? "Could not upload your photograph. Please try again.");
      }
      if (!data?.submission) throw new Error("The server returned an unexpected response. Please refresh the gallery before retrying.");
      const guestName = String(form.get("guestName") ?? "");
      window.localStorage.setItem(guestNameKey, guestName);
      setSuccess(data.submission.status);
      await load(true);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Could not upload your photograph.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f1f6f2]"><LoaderCircle className="h-8 w-8 animate-spin text-[#466c52]" /></main>;
  if (!snapshot) return <main className="grid min-h-screen place-items-center bg-[#f1f6f2] p-5"><div className="max-w-md text-center"><MilloweLogo /><h1 className="mt-14 font-serif text-5xl">That gallery is out of frame.</h1><p className="mt-4 leading-7 text-ink/55">{error || "Return to the welcome page and try again."}</p><a className="button button-dark mt-7" href="/"><ArrowLeft className="h-4 w-4" /> Back home</a></div></main>;

  const { event, categories } = snapshot;

  return (
    <main className="guest-gallery min-h-screen bg-[#dce8df] text-ink">
      <header className="bg-[#edf3ee] px-4 py-4 sm:px-7">
        <div className="mx-auto flex max-w-[1384px] items-center gap-3 sm:gap-6">
          <div className="shrink-0 max-sm:[&_a]:gap-0 max-sm:[&_a>span:last-child]:hidden"><MilloweLogo compact /></div>
          <nav aria-label="Gallery pages" className="flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
            <a href="/" aria-current={view === "missions" ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold transition sm:px-5 sm:text-sm ${view === "missions" ? "bg-forest text-[#f1f6f2]" : "text-ink/70 hover:bg-[#dce8df]"}`}>Photo missions</a>
            <a href="/submissions" aria-current={view === "submissions" ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold transition sm:px-5 sm:text-sm ${view === "submissions" ? "bg-forest text-[#f1f6f2]" : "text-ink/70 hover:bg-[#dce8df]"}`}>Submissions</a>
            {event.status === "closed" && <a href="/uploads" aria-current={view === "uploads" ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold sm:px-5 sm:text-sm ${view === "uploads" ? "bg-forest text-[#f1f6f2]" : "text-ink/70 hover:bg-[#dce8df]"}`}>Uploads</a>}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-forest/12 bg-[#f1f6f2]/50 p-2.5 text-xs font-bold sm:px-3" role="status" aria-label={event.status === "collecting" ? "Gallery live" : event.status === "voting" ? "Guest voting" : event.status === "judging" ? "Judging now" : "Event complete"}>
            <span className={`h-2 w-2 rounded-full ${event.status === "collecting" ? "animate-pulse bg-[#579160]" : event.status === "judging" ? "bg-[#b0cbb8]" : "bg-ink/25"}`} />
            <span className="hidden sm:inline">{event.status === "collecting" ? "Gallery live" : event.status === "voting" ? "Guest voting" : event.status === "judging" ? "Judging now" : "Event complete"}</span>
          </div>
        </div>
      </header>

      {view === "uploads" && (event.status === "closed" ? <WeddingUploads /> : <section className="mx-auto max-w-[1384px] px-5 py-16"><h1 className="font-serif text-4xl">Uploads are not open yet</h1><p className="mt-4">You can share additional wedding photos once the event is closed.</p><a href="/" className="button button-dark mt-6">Back to categories</a></section>)}

      {view === "submissions" && winners.length > 0 && (
        <section className="bg-[#cbded0] px-4 py-10 sm:px-7"><div className="mx-auto max-w-[1384px]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#b0cbb8]"><Trophy className="h-5 w-5" /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink/45">Selected by the organizers</p><h2 className="font-serif text-3xl">The winning frames</h2></div></div><div className="mt-7 flex snap-x gap-4 overflow-x-auto pb-2 soft-scrollbar">{winners.map((winner) => { const category = categories.find((item) => item.id === winner.categoryId); return <article key={winner.id} className="min-w-[260px] max-w-[340px] snap-start overflow-hidden rounded-3xl bg-[#f1f6f2]"><img src={winner.imageUrl} className="aspect-[4/3] w-full object-cover" alt={winner.caption || `Winning photo by ${winner.guestName}`} /><div className="p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#466c52]">{category?.title}</p><p className="mt-1 font-serif text-lg"><PhotoCredit name={winner.guestName} createdAt={winner.createdAt} /></p></div></article>; })}</div></div></section>
      )}

      {view === "missions" && <section className="bg-[#dce8df] px-4 py-12 sm:px-7 sm:py-16">
        <div className="mx-auto max-w-[1384px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#466c52]">Photo missions</p><h2 className="mt-2 font-serif text-4xl sm:text-5xl">Categories</h2></div></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {categories.filter((category) => category.active).map((category, index) => { const IconComponent = iconMap[category.icon as keyof typeof iconMap] ?? Camera; const winner = snapshot.submissions.find((photo) => photo.categoryId === category.id && photo.isWinner); return <article key={category.id} className="group flex min-h-64 flex-col rounded-[1.75rem] border border-[#bfd1c3] bg-[#f1f6f2] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d4e4d7] text-[#3e654b]"><IconComponent className="h-5 w-5" /></span><span className="font-mono text-[10px] font-bold text-[#698573]">0{index + 1}</span></div><h3 className="mt-7 font-serif text-2xl leading-tight">{category.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-ink/70">{category.prompt}</p>{event.status === "closed" ? (winner ? <a href={`/submissions?category=${encodeURIComponent(category.id)}`} className="mt-5 overflow-hidden rounded-2xl border border-[#bfd1c3] bg-[#d4e4d7]"><img src={winner.imageUrl} alt={winner.caption || `Winning photo sent by ${winner.guestName}`} className="aspect-[4/3] w-full object-cover" /><div className="p-3"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide"><Trophy className="h-4 w-4" />Winner</span><p className="mt-1 text-sm"><PhotoCredit name={winner.guestName} createdAt={winner.createdAt} /></p></div></a> : <p className="mt-5 rounded-xl bg-[#d4e4d7] p-3 text-sm text-forest">No winner selected</p>) : event.status === "collecting" ? <button className="mt-5 flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-bold text-[#f1f6f2] transition hover:bg-[#365b43]" onClick={() => openUpload(category)}><Camera className="h-4 w-4" /> Capture this</button> : <button className="mt-5 rounded-full bg-[#d4e4d7] px-4 py-3 text-sm font-bold text-[#30553c] transition hover:bg-[#bfd5c4]" onClick={() => { window.location.assign(`/submissions?category=${encodeURIComponent(category.id)}`); }}>View entries</button>}</article>; })}
          </div>
        </div>
      </section>}

      {view === "submissions" && <section id="gallery" className="bg-[#dce8df] px-4 py-12 sm:px-7 sm:py-16">
        <div className="mx-auto mb-6 max-w-[1384px]"><p className="text-sm text-forest">{event.status === "voting" ? "Guest voting is open — like your favorite photos. One like per photo per browser." : event.status === "collecting" ? "" : "Voting is closed. Final like counts are shown below."}</p>{likeError && <p role="alert" className="mt-2 text-sm text-red-800">{likeError}</p>}</div>
        <div className="mx-auto max-w-[1384px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#4f7b56]"><RefreshCw className="h-3 w-3" /> Updates live</div><h2 className="mt-2 font-serif text-4xl sm:text-5xl">Everyone&apos;s point of view</h2></div><div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 soft-scrollbar"><button onClick={() => setActiveCategory("all")} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold ${activeCategory === "all" ? "bg-forest text-[#f1f6f2]" : "bg-[#f1f6f2] text-ink/55"}`}>All moments</button>{categories.map((category) => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold ${activeCategory === category.id ? "bg-forest text-[#f1f6f2]" : "bg-[#f1f6f2] text-ink/55"}`}>{category.title}</button>)}</div></div>
          {visible.length === 0 ? <div className="mt-8 grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-forest/18 bg-[#f1f6f2]/35 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1f6f2]"><ImageIcon className="h-6 w-6 text-ink/30" /></span><h3 className="mt-4 font-serif text-2xl">The first frame is waiting</h3><p className="mt-2 text-sm text-ink/45">Be the first guest to share this view.</p></div></div> : <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">{visible.map((submission) => { const category = categories.find((item) => item.id === submission.categoryId); return <article key={submission.id} className="gallery-in mb-4 break-inside-avoid overflow-hidden rounded-3xl border border-[#bfd1c3] bg-[#f1f6f2] shadow-sm"><div className="relative"><img src={submission.imageUrl} alt={submission.caption || `Photo by ${submission.guestName}`} className="max-h-[620px] w-full object-cover" />{submission.isWinner && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#b0cbb8] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider"><Trophy className="h-3 w-3" /> Winner</span>}</div><div className="p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#466c52]">{category?.title}</p>{submission.caption && <p className="mt-1 font-serif text-xl">“{submission.caption}”</p>}<p className="mt-2 text-xs text-ink/42"><PhotoCredit name={submission.guestName} createdAt={submission.createdAt} /></p><button type="button" aria-pressed={submission.likedByMe} disabled={event.status !== "voting" || liking !== null} onClick={() => likePhoto(submission.id, submission.likedByMe)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d4e4d7] px-3 py-2 text-sm font-semibold text-forest enabled:hover:bg-[#bfd5c4] disabled:cursor-default"><Heart className={`h-4 w-4 ${submission.likedByMe ? "fill-current" : ""}`} />{submission.likeCount} {submission.likeCount === 1 ? "like" : "likes"}{submission.likedByMe ? " · Unlike" : ""}</button></div></article>; })}</div>}
        </div>
      </section>}

      {uploadCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#f1f6f2] p-5 shadow-2xl sm:rounded-[2rem] sm:p-8 soft-scrollbar">
            <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#466c52]">Photo mission</p><h2 id="upload-title" className="mt-2 font-serif text-4xl leading-none">{uploadCategory.title}</h2><p className="mt-3 leading-6 text-ink/52">{uploadCategory.prompt}</p></div><button onClick={closeUpload} className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#f1f6f2]"><X className="h-4 w-4" /></button></div>
            {success ? <div className="grid min-h-80 place-items-center text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dce9db] text-[#32603a]"><Check className="h-7 w-7" /></span><h3 className="mt-5 font-serif text-3xl">That moment is in.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/70">Everyone at the event can now see what you noticed.</p><button onClick={() => window.location.assign("/submissions")} className="button button-dark mt-6">View submissions</button></div></div> : <form onSubmit={submitPhoto} className="mt-7">
              <label className={`relative grid min-h-64 cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed ${preview ? "border-transparent bg-forest" : "border-forest/18 bg-[#f1f6f2]"}`}><input className="sr-only" type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} />{preview ? <><img src={preview} className="absolute inset-0 h-full w-full object-contain" alt="Selected photo preview" /><span className="absolute bottom-4 rounded-full bg-forest/80 px-4 py-2 text-xs font-bold text-[#f1f6f2] backdrop-blur">Tap to choose another</span></> : <div className="p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest text-[#f1f6f2]"><Camera className="h-6 w-6" /></span><p className="mt-4 font-bold">Take or choose a photo</p><p className="mt-1 text-sm text-ink/45">JPEG, PNG or WebP</p></div>}</label>
              <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="guestName">Your name</label><input className="field" id="guestName" name="guestName" required maxLength={50} defaultValue={typeof window !== "undefined" ? window.localStorage.getItem(guestNameKey) ?? "" : ""} placeholder="Maya" /></div><div><label className="field-label" htmlFor="caption">A few words <span className="normal-case tracking-normal">(optional)</span></label><input className="field" id="caption" name="caption" maxLength={140} placeholder="Right before the rain" /></div></div>
              {uploadError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{uploadError}</p>}
              <button disabled={uploading || !photo} className="button button-dark mt-5 w-full disabled:cursor-not-allowed disabled:opacity-45" type="submit">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? "Adding your moment…" : "Add to the gallery"}</button>
            </form>}
          </div>
        </div>
      )}
    </main>
  );
}
