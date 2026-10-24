from pathlib import Path
p=Path('components/host-event-studio.tsx');s=p.read_text().replace('import { PhotoCredit }','import { JudgingPreview } from "@/components/judging-preview";\nimport { PhotoCredit }',1).replace('  const [snapshot,','  const [previewId, setPreviewId] = useState<string | null>(null);\n  const [snapshot,',1)
s=s.replace('  const finalistCount =','  useEffect(() => { setPreviewId(null); }, [snapshot?.event.status]);\n\n  const finalistCount =',1)
old='<img src={submission.imageUrl} alt={submission.caption || submission.guestName} className="max-h-[520px] w-full object-cover" />'
# locate actual image line
for line in s.splitlines():
 if 'max-h-[520px]' in line:
  old=line.strip();break
s=s.replace(old,'<button type="button" disabled={event.status !== "judging"} onClick={() => setPreviewId(submission.id)} aria-label={`Preview photo by ${submission.guestName} on the live wall`} className="block w-full disabled:cursor-default focus-visible:outline-4 focus-visible:outline-forest">'+old+'</button>')
s=s.replace('    <main ', '    <main ',1)
pos=s.rfind('</main>');s=s[:pos]+'''{event.status === "judging" && previewId && snapshot.submissions.some((photo) => photo.id === previewId && photo.status === "approved") && <JudgingPreview key={previewId} eventId={eventId} photo={snapshot.submissions.find((photo) => photo.id === previewId)!} onClose={() => setPreviewId(null)} />}
      '''+s[pos:];p.write_text(s)
p=Path('components/live-wall.tsx');s=p.read_text().replace('  const [photoIndex,','  const [capacity, setCapacity] = useState(4);\n  const [page, setPage] = useState(0);\n  const [now, setNow] = useState(Date.now());\n  const [photoIndex,',1)
s=s.replace('            updatesRef.current?.scrollTo({ top: 0, behavior: "instant" });','            setPage(0);')
s=s.replace('  const recent = snapshot?.submissions.slice(0, 3) ?? [];','''  useEffect(() => {
    const node = updatesRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setCapacity(Math.max(1, Math.floor((node.clientHeight - 24) / 116))));
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
  const spotlight = snapshot?.event.status === "judging" && snapshot.spotlight && snapshot.spotlight.expiresAt > now ? snapshot.submissions.find((photo) => photo.id === snapshot.spotlight!.photoId) : null;''')
s=s.replace('grid h-full min-h-0 grid-rows-3 gap-3','grid min-h-0 auto-rows-[104px] gap-3').replace('h-full max-h-24 w-20','h-full w-16').replace('min-w-0 flex-1 py-1','min-w-0 flex-1').replace('mb-2 inline-flex','absolute right-2 top-2 inline-flex').replace('mt-1 text-sm font-semibold','mt-1 text-xs font-semibold').replace('mt-1 line-clamp-2 text-xs leading-5','mt-1 line-clamp-1 text-xs leading-4').replace('mt-2 flex items-center','mt-1 flex items-center')
s=s.replace('          </div>\n        </aside>','''          </div>
          {spotlight && <div key={spotlight.id} className="wall-spotlight absolute inset-0 z-20 flex min-h-0 flex-col bg-[#172a20] p-6">
            <header className="mb-4 flex shrink-0 items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a4d2b1]">Judging • Photo in focus</p><h2 className="mt-1 font-serif text-2xl">{snapshot?.categories.find((category) => category.id === spotlight.categoryId)?.title}</h2></div><span className="flex items-center gap-2"><Heart className="h-5 w-5" />{spotlight.likeCount}</span></header>
            <img src={spotlight.imageUrl} alt={spotlight.caption || `Photo by ${spotlight.guestName}`} className="min-h-0 w-full flex-1 object-contain" />
            <footer className="mt-4 shrink-0 text-center"><PhotoCredit name={spotlight.guestName} createdAt={spotlight.createdAt} />{spotlight.caption && <p className="mt-2 line-clamp-2 text-cream/75">{spotlight.caption}</p>}</footer>
          </div>}
        </aside>''');p.write_text(s)
p=Path('app/globals.css');s=p.read_text().replace('minmax(0,1fr) minmax(0,30%)','minmax(0,1fr) minmax(0,clamp(280px,24vw,360px))');s+='\n.wall-display .wall-layout:not(.wall-layout-expanded) { grid-template-columns: minmax(0, 1fr) minmax(0, clamp(280px, 24vw, 360px)); }\n.wall-spotlight { animation: wall-focus-in 350ms ease-out both; }\n@keyframes wall-focus-in { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }\n@media (prefers-reduced-motion: reduce) { .wall-spotlight { animation: none; } }\n';p.write_text(s)
