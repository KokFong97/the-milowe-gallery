"use client";

import { JudgingPreview } from "@/components/judging-preview";
import { PhotoCredit } from "@/components/photo-credit";
import { compareJudgingPhotos } from "@/lib/photo-ranking";
import { AdminWeddingUploads } from "@/components/admin-wedding-uploads";
import { SlideshowSettings } from "@/components/slideshow-settings";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Trash2,
  Heart,
  Check,
  ChevronDown,
  CircleStop,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  LoaderCircle,
  MonitorUp,
  Plus,
  ScanLine,
  Settings2,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import type { EventSnapshot, MilloweCategory, MilloweSubmission, SubmissionStatus } from "@/lib/millowe-types";

type GalleryFilter = "all" | "finalists" | "winners";

const iconFor = (icon: string) => {
  if (icon === "Sparkles" || icon === "WandSparkles") return Sparkles;
  if (icon === "Users") return UserRound;
  if (icon === "Image") return ImageIcon;
  return GalleryHorizontalEnd;
};

export function HostEventStudio({ eventId }: { eventId: string }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showAddMission, setShowAddMission] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MilloweCategory | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/host/events/${eventId}`, { cache: "no-store" });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load this event.");
      setSnapshot(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this event.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!snapshot) return;
    const url = `${window.location.origin}/`;
    void QRCode.toDataURL(url, { width: 1200, margin: 4, color: { dark: "#17291f", light: "#fbf8f1" } }).then(setQrDataUrl);
  }, [snapshot?.event.id]);

  useEffect(() => {
    if (snapshot?.event.status === "judging") {
      setActiveCategory(snapshot.event.judgingCategoryId ?? "all");
      setFilter("all");
    }
  }, [snapshot?.event.status, snapshot?.event.judgingCategoryId]);

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.submissions.filter((submission) => {
      if (activeCategory !== "all" && submission.categoryId !== activeCategory) return false;
      if (filter === "finalists") return submission.isFinalist;
      if (filter === "winners") return submission.isWinner;
      return submission.status !== "hidden";
    }).sort((a, b) => snapshot.event.status === "judging" ? compareJudgingPhotos(a, b) : 0);
  }, [snapshot, activeCategory, filter]);

  useEffect(() => { setPreviewId(null); }, [snapshot?.event.status]);

  const finalistCount = snapshot?.submissions.filter((item) => item.isFinalist).length ?? 0;

  async function updateEvent(changes: Record<string, unknown>) {
    setBusy("event");
    setError("");
    try {
      const response = await fetch(`/api/host/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update the event.");
      setSnapshot(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the event.");
    } finally {
      setBusy("");
    }
  }

  async function updateSubmission(submission: MilloweSubmission, changes: { status?: SubmissionStatus; isFinalist?: boolean; isWinner?: boolean }) {
    setBusy(submission.id);
    setError("");
    try {
      const response = await fetch(`/api/host/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update the photograph.");
      setSnapshot(data);
      if (changes.isWinner) setNotice("Winner selected. It is now featured in the guest gallery.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the photograph.");
    } finally {
      setBusy("");
    }
  }

  async function addMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateEvent({ addCategory: { title: form.get("title"), prompt: form.get("prompt"), icon: "Camera" } });
    setShowAddMission(false);
  }

  async function deleteItem(kind: "category" | "submission", id: string, label: string) {
    const message = kind === "category"
      ? `Delete the category "${label}" and remove all its photos from the gallery? Original photo files will be kept in storage.`
      : `Delete the photo from ${label} from the gallery? The original file will be kept in storage.`;
    if (!window.confirm(message)) return;
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/host/${kind === "category" ? "categories" : "submissions"}/${id}`, { method: "DELETE" });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete this item.");
      setSnapshot(data);
      if (kind === "category") { setEditingCategory(null); if (activeCategory === id) setActiveCategory("all"); }
      setNotice("Removed from the gallery. Original photo files are retained in storage.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete this item."); }
    finally { setBusy(""); }
  }

  async function saveMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) return;
    const form = new FormData(event.currentTarget);
    setBusy(editingCategory.id);
    try {
      const response = await fetch(`/api/host/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          prompt: form.get("prompt"),
          active: form.get("active") === "on",
        }),
      });
      const data = (await response.json()) as EventSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save this mission.");
      setSnapshot(data);
      setEditingCategory(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this mission.");
    } finally {
      setBusy("");
    }
  }

  async function copyGuestLink() {
    if (!snapshot) return;
    await navigator.clipboard.writeText(`${window.location.origin}/`);
    setNotice("Guest link copied.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-cream"><LoaderCircle className="h-8 w-8 animate-spin text-coral" /></main>;
  if (!snapshot) return <main className="grid min-h-screen place-items-center bg-cream p-6"><div className="text-center"><h1 className="font-serif text-4xl">Event unavailable</h1><p className="mt-3 text-ink/55">{error}</p><Link className="button button-dark mt-6" href="/">Back to gallery</Link></div></main>;

  const { event, categories } = snapshot;

  return (
    <main className="min-h-screen bg-[#ece9df] text-ink">
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-cream/92 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="min-w-0"><h1 className="truncate font-serif text-xl">The Milowe Gallery - Admin</h1><p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink/42">Wedding photo gallery</p></div>
          <div className="flex items-center gap-2"><form action="/api/admin/logout" method="post"><button className="button button-outline !min-h-10 !px-3 !py-2 text-sm" type="submit">Sign out</button></form>
            <Link className="button button-outline !min-h-10 !px-3 !py-2 text-sm" href="/wall" target="_blank"><MonitorUp className="h-4 w-4" /><span className="hidden sm:inline">Live wall</span></Link>
            <button className="button button-dark !min-h-10 !px-3 !py-2 text-sm" onClick={copyGuestLink}><Clipboard className="h-4 w-4" /><span className="hidden sm:inline">Copy guest link</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-8 xl:grid-cols-[310px_minmax(0,1fr)_310px]">
        <aside className="space-y-5">
          <section className="panel bg-paper p-5">
            <div className="flex items-center justify-between"><p className="field-label !mb-0">Event flow</p><span className={`h-2.5 w-2.5 rounded-full ${event.status === "collecting" ? "animate-pulse bg-[#4f8c59]" : event.status === "judging" ? "bg-sun" : "bg-ink/30"}`} /></div>
            <div className="mt-4 grid gap-2">
              {[
                ["collecting", Eye, "Submission", "Guests can submit"],
                ["voting", Heart, "Guest voting", "Guests can like photos"],
                ["judging", Trophy, "Judging", "Uploads are closed"],
                ["closed", CircleStop, "Closed", "Winners are final"],
              ].map(([status, Icon, title, copy]) => {
                const IconComponent = Icon as typeof Eye;
                const selected = event.status === status;
                if (status === "judging") return (
                  <div key="judging" className={`rounded-2xl border p-3 ${selected ? "border-forest bg-forest text-cream" : "border-forest/10 bg-white"}`}>
                    <button type="button" disabled={busy === "event"} aria-pressed={selected} onClick={() => { setActiveCategory("all"); setFilter("all"); void updateEvent({ status: "judging", judgingCategoryId: null }); }} className="mb-3 flex w-full items-center gap-3 rounded-xl text-left outline-offset-4 transition hover:opacity-80 disabled:opacity-50">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? "bg-cream/10" : "bg-sage"}`}><Trophy className="h-4 w-4" /></span><span><span className="block text-sm font-bold">Judging</span><span className={`text-xs ${selected ? "text-cream/60" : "text-ink/50"}`}>Review and shortlist photos</span></span>{selected && <Check className="ml-auto h-4 w-4" />}
                    </button>
                    <div className="relative">
                      <select id="judging-category" aria-label="Category to judge" disabled={busy === "event"} className="w-full cursor-pointer appearance-none rounded-xl border border-[#bfd1c3] bg-[#edf3ee] py-3 pl-3 pr-10 text-sm font-semibold text-forest shadow-sm outline-none transition hover:bg-[#e0ebe3] focus:border-[#52765d] focus:ring-2 focus:ring-[#a4c4ad]/50 disabled:cursor-wait disabled:opacity-50" value={selected ? event.judgingCategoryId ?? "all" : "all"} onChange={(e) => { const categoryId = e.target.value; setActiveCategory(categoryId); setFilter("all"); void updateEvent({ status: "judging", judgingCategoryId: categoryId === "all" ? null : categoryId }); }}>
                        <option value="all">All categories</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
                      </select>
                      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/60" />
                    </div>
                  </div>
                );
                return <button key={status as string} disabled={busy === "event"} onClick={() => updateEvent({ status })} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-forest bg-forest text-cream" : "border-forest/10 bg-white hover:border-forest/25"}`}><span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${selected ? "bg-cream/10" : "bg-sage"}`}><IconComponent className="h-4 w-4" /></span><span><span className="block text-sm font-bold">{title as string}</span><span className={`text-xs ${selected ? "text-cream/50" : "text-ink/45"}`}>{copy as string}</span></span>{selected && <Check className="ml-auto h-4 w-4" />}</button>;
              })}
            </div>
          </section>

          <section className="panel bg-paper p-5">
            <div className="flex items-center justify-between"><p className="field-label !mb-0">Photo missions</p><button onClick={() => setShowAddMission((value) => !value)} className="grid h-8 w-8 place-items-center rounded-full bg-forest text-cream"><Plus className="h-4 w-4" /></button></div>
            {showAddMission && <form onSubmit={addMission} className="mt-4 space-y-3 rounded-2xl bg-sage p-3"><input name="title" required maxLength={60} className="field !rounded-xl !p-3 text-sm" placeholder="Mission title" /><textarea name="prompt" maxLength={180} className="field min-h-20 resize-none !rounded-xl !p-3 text-sm" placeholder="What should guests look for?" /><button type="submit" className="button button-coral !min-h-9 w-full !py-2 text-xs">Add mission</button></form>}
            {editingCategory && <form onSubmit={saveMission} className="mt-4 space-y-3 rounded-2xl border border-coral/15 bg-[#f4e5de] p-3"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-wider text-coral">Edit mission</p><button type="button" onClick={() => setEditingCategory(null)} className="grid h-7 w-7 place-items-center rounded-full bg-white"><X className="h-3.5 w-3.5" /></button></div><input name="title" required maxLength={60} defaultValue={editingCategory.title} className="field !rounded-xl !p-3 text-sm" /><textarea name="prompt" maxLength={180} defaultValue={editingCategory.prompt} className="field min-h-24 resize-none !rounded-xl !p-3 text-sm" /><label className="flex items-center gap-2 text-xs font-bold text-ink/60"><input type="checkbox" name="active" defaultChecked={editingCategory.active} /> Show this mission to guests</label><button disabled={busy === editingCategory.id} type="submit" className="button button-coral !min-h-9 w-full !py-2 text-xs">Save mission</button><button type="button" disabled={busy === editingCategory.id} onClick={() => deleteItem("category", editingCategory.id, editingCategory.title)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-800"><Trash2 className="h-4 w-4" /> Delete category</button></form>}
            <div className="mt-4 space-y-2">
              <button onClick={() => setActiveCategory("all")} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeCategory === "all" ? "bg-sage" : "hover:bg-sage/60"}`}><span>All photographs</span><span className="font-mono text-xs text-ink/40">{snapshot.submissions.length}</span></button>
              {categories.map((category) => {
                const IconComponent = iconFor(category.icon);
                return <div key={category.id} className={`flex items-center gap-1 rounded-xl pr-1 ${activeCategory === category.id ? "bg-sage" : "hover:bg-sage/60"}`}><button onClick={() => setActiveCategory(category.id)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left ${category.active ? "" : "opacity-40"}`}><IconComponent className="h-4 w-4 flex-none text-coral" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{category.title}</span><span className="font-mono text-xs text-ink/40">{category.submissionCount}</span></button><button aria-label={`Edit ${category.title}`} onClick={() => setEditingCategory(category)} className="grid h-8 w-8 flex-none place-items-center rounded-full text-ink/35 hover:bg-white hover:text-ink"><Settings2 className="h-3.5 w-3.5" /></button></div>;
              })}
            </div>
          </section>


        </aside>

        <section className="min-w-0">
          <div className="panel bg-paper p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-coral">Live collection</p><h2 className="mt-1 font-serif text-3xl">The gallery</h2></div>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-sage p-1 soft-scrollbar">
                {(["all", "finalists", "winners"] as GalleryFilter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold capitalize transition ${filter === item ? "bg-white shadow-sm" : "text-ink/48 hover:text-ink"}`}>{item}{item === "finalists" && finalistCount > 0 ? ` ${finalistCount}` : ""}</button>)}
              </div>
            </div>

            {error && <div className="mt-5 rounded-xl border border-coral/20 bg-coral/8 p-3 text-sm font-semibold text-coral">{error}</div>}
            {notice && <div className="mt-5 rounded-xl border border-[#4f8c59]/20 bg-[#dce9db] p-3 text-sm font-semibold text-[#32603a]">{notice}</div>}

            {filtered.length === 0 ? (
              <div className="grid min-h-[460px] place-items-center text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sage"><ScanLine className="h-7 w-7 text-forest/50" /></span><h3 className="mt-5 font-serif text-3xl">Nothing here yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/48">Share the QR code with guests. New photographs will appear here automatically.</p></div></div>
            ) : (
              <div className="mt-6 columns-1 gap-4 sm:columns-2 2xl:columns-3">
                {filtered.map((submission) => {
                  const category = categories.find((item) => item.id === submission.categoryId);
                  return (
                    <article key={submission.id} className="gallery-in mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-forest/10 bg-white">
                      <button type="button" disabled={event.status !== "judging"} onClick={() => setPreviewId(submission.id)} aria-label={`Preview photo by ${submission.guestName} on the live wall`} className="block w-full disabled:cursor-default focus-visible:outline-4 focus-visible:outline-forest"><div className="relative bg-sage"><img src={submission.imageUrl} alt={submission.caption || `Photograph by ${submission.guestName}`} className="max-h-[520px] w-full object-cover" />{submission.isWinner && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider"><Trophy className="h-3 w-3" /> Winner</span>}{submission.isFinalist && !submission.isWinner && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur"><Star className="h-3 w-3 fill-coral text-coral" /> Finalist</span>}</div></button>
                      <div className="p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-coral">{category?.title}</p>{submission.caption && <p className="mt-1 font-serif text-lg">“{submission.caption}”</p>}<p className="mt-2 text-xs text-ink/45"><PhotoCredit name={submission.guestName} createdAt={submission.createdAt} /></p><p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-forest"><Heart className="h-3.5 w-3.5" />{submission.likeCount} likes</p>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-forest/8 pt-3"><button disabled={busy === submission.id} onClick={() => deleteItem("submission", submission.id, submission.guestName)} className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-800"><Trash2 className="h-3.5 w-3.5" />Delete photo</button>
                          <button disabled={busy === submission.id} onClick={() => updateSubmission(submission, { isFinalist: !submission.isFinalist, isWinner: submission.isFinalist ? false : undefined })} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${submission.isFinalist ? "bg-coral text-white" : "bg-sage text-ink/65"}`}><Star className={`h-3.5 w-3.5 ${submission.isFinalist ? "fill-white" : ""}`} /> {submission.isFinalist ? "Shortlisted" : "Shortlist"}</button>
                          {(event.status === "judging" || event.status === "closed") && submission.isFinalist && <button disabled={busy === submission.id} onClick={() => updateSubmission(submission, { isWinner: true })} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${submission.isWinner ? "bg-sun text-ink" : "bg-forest text-cream"}`}><Trophy className="h-3.5 w-3.5" /> {submission.isWinner ? "Winner" : "Choose winner"}</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-2 xl:col-span-1">
          <section className="panel overflow-hidden bg-paper p-5">
            <div className="flex items-center justify-between"><div><p className="field-label !mb-0">Guest entry</p><p className="mt-1 text-sm font-semibold">Scan to open the gallery</p></div><ScanLine className="h-5 w-5 text-coral" /></div>
            <div className="mx-auto mt-4 aspect-square max-w-[230px] overflow-hidden rounded-3xl bg-white p-3">{qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${event.title}`} className="h-full w-full" /> : <div className="grid h-full place-items-center"><LoaderCircle className="h-6 w-6 animate-spin" /></div>}</div>
            <div className="mt-4 rounded-2xl bg-sage p-4 text-center"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/40">One direct link</p><p className="mt-1 text-sm font-semibold text-forest">No guest account or sign-in needed</p></div>
            <button className="button button-dark mt-3 w-full !min-h-11 text-sm" onClick={copyGuestLink}><Clipboard className="h-4 w-4" /> Copy gallery link</button>
            {qrDataUrl && <a href={qrDataUrl} download="the-milowe-gallery-qr.png" className="button button-outline mt-3 w-full !min-h-11 text-sm"><Download className="h-4 w-4" /> Download QR code</a>}
          </section>



          <SlideshowSettings snapshot={snapshot} onUpdate={setSnapshot} />

        </aside>
        <AdminWeddingUploads eventId={eventId} />
      </div>
    {event.status === "judging" && previewId && snapshot.submissions.some((photo) => photo.id === previewId && photo.status === "approved") && <JudgingPreview key={previewId} eventId={eventId} photo={snapshot.submissions.find((photo) => photo.id === previewId)!} onClose={() => setPreviewId(null)} />}
      </main>
  );
}
