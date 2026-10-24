import { useEffect, useState } from "react";
import { PhotoCredit } from "@/components/photo-credit";
import { compareJudgingPhotos } from "@/lib/photo-ranking";
import { Camera, Heart, Star, Trophy } from "lucide-react";
import type { EventSnapshot } from "@/lib/millowe-types";

export function CategoryPhotoWall({ snapshot }: { snapshot: EventSnapshot }) {
  const selected = snapshot.event.status === "judging" ? snapshot.event.judgingCategoryId : null;
  const categories = snapshot.categories.filter((category) => !selected || category.id === selected);
  const [page, setPage] = useState(0);
  const selectedCount = snapshot.submissions.filter((photo) => photo.categoryId === selected).length;
  const pages = Math.max(1, Math.ceil(selectedCount / 6));
  useEffect(() => {
    setPage(0);
    if (!selected || pages < 2) return;
    const timer = setInterval(() => setPage((value) => (value + 1) % pages), 8000);
    return () => clearInterval(timer);
  }, [selected, pages]);
  const columns = selected ? 1 : Math.max(1, Math.ceil(Math.sqrt(categories.length)));
  const rows = Math.max(1, Math.ceil(categories.length / columns));
  return <section style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }} aria-label="Photos ranked by category" className="grid min-h-0 flex-1 gap-3 overflow-hidden">
    {categories.map((category) => {
      const photos = snapshot.submissions.filter((photo) => photo.categoryId === category.id).sort((a, b) => (snapshot.event.status === "judging" || snapshot.event.status === "closed") ? compareJudgingPhotos(a, b) : b.likeCount - a.likeCount || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      const visible = selected ? photos.slice((page % pages) * 6, (page % pages) * 6 + 6) : photos.slice(0, 3);
      return <section key={category.id} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-cream/10 bg-[#192d23] p-3">
        <header className="mb-2 flex shrink-0 items-start justify-between gap-3"><h3 className="truncate font-serif text-xl text-[#c9e5d0]">{category.title}</h3><span className="shrink-0 text-xs text-cream/60">{!photos.length ? "" : selected ? `${page % pages + 1}/${pages}` : `Top ${Math.min(3, photos.length)} of ${photos.length}`}</span></header>
        {photos.length > 0 && <div key={`${selected}-${page}`} className={selected ? "wall-photo-page grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-3" : "grid min-h-0 flex-1 grid-rows-3 gap-2"}>
          {visible.map((photo, index) => <article key={photo.id} className={`min-h-0 overflow-hidden rounded-xl bg-[#20362b] ${selected ? "flex flex-col" : "flex items-stretch gap-2 p-2"}`}>
            <img src={photo.imageUrl} alt={photo.caption || `Photo sent by ${photo.guestName}`} className={selected ? "min-h-0 w-full flex-1 bg-black/20 object-contain" : "h-full min-h-0 w-[30%] shrink-0 rounded-lg object-cover"} />
            <div className={`min-h-0 min-w-0 overflow-hidden ${selected ? "shrink-0 p-2" : "flex-1 self-center"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs text-cream/50">#{(selected ? (page % pages) * 6 : 0) + index + 1}</span><span className="flex items-center gap-1.5 text-sm font-bold text-[#c9e5d0]"><Heart className="h-4 w-4" />{photo.likeCount}</span></div>
              <p className="mt-1 text-xs"><PhotoCredit name={photo.guestName} createdAt={photo.createdAt} /></p>
              {selected && photo.caption && <p className="mt-1 line-clamp-2 text-xs text-cream/65">{photo.caption}</p>}
              {photo.isWinner ? <p className="mt-2 flex items-center gap-1 text-xs text-sun"><Trophy className="h-3 w-3" />Winner</p> : photo.isFinalist && <p className="mt-2 flex items-center gap-1 text-xs text-[#c9e5d0]"><Star className="h-3 w-3" />Shortlisted</p>}
            </div>
          </article>)}
        </div>}
        {!photos.length && <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#a4d2b1]/15 bg-[#c9e5d0]/[.025] p-4 text-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c9e5d0]/10 text-[#a4d2b1]"><Camera className="h-5 w-5" strokeWidth={1.5} /></span><p className="max-w-52 text-sm leading-relaxed text-[#c9e5d0]/70">No shared photos in this category yet.</p></div>}
      </section>;
    })}
  </section>;
}
