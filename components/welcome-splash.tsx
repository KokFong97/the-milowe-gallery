"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

const SESSION_KEY = "milowe-welcome-seen";

export function WelcomeSplash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "showing" | "leaving" | "done">("checking");
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Storage may be disabled. */ }
    setPhase((current) => current === "done" ? current : "leaving");
  }, []);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      if (sessionStorage.getItem(SESSION_KEY)) { setPhase("done"); return; }
    } catch { /* Still show a dismissible welcome when storage is unavailable. */ }
    setPhase("showing");
  }, []);

  useEffect(() => {
    if (phase !== "showing") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("keydown", escape);
    const timer = window.setTimeout(dismiss, loaded ? (reducedMotion ? 800 : 2800) : 7000);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", escape);
      window.clearTimeout(timer);
    };
  }, [phase, loaded, reducedMotion, dismiss]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("done"), reducedMotion ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  return (
    <>
      <div inert={phase !== "done"}>{children}</div>
      {phase !== "done" && (
        <div className={`welcome-splash ${phase === "leaving" ? "welcome-splash-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="Welcome to The Milowe Gallery">
          {phase !== "checking" && <>
            <div className={`welcome-art ${loaded ? "welcome-art-ready" : ""}`}>
              <img src="/malfel-welcome.svg" width={600} height={600} alt="MalFel wedding welcome" onLoad={() => setLoaded(true)} onError={dismiss} className="h-auto max-h-[75dvh] w-[min(86vw,560px)] object-contain" />
            </div>
            <button type="button" onClick={dismiss} className="absolute bottom-8 rounded-full border border-forest/20 bg-white/60 px-6 py-3 text-sm font-semibold text-forest transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">Enter the gallery</button>
          </>}
        </div>
      )}
    </>
  );
}
