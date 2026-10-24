"use client";

import { useState, type FormEvent } from "react";
import { MilloweLogo } from "@/components/millowe-logo";

export function WeddingSetup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createWedding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/host/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not prepare the wedding.");
      window.location.assign("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the wedding.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-sage p-5">
      <section className="panel w-full max-w-xl bg-cream p-8">
        <MilloweLogo />
        <h1 className="mt-10 font-serif text-4xl">Prepare your wedding gallery</h1>
        <p className="mt-3 text-ink/70">Set up your wedding once. Five photo missions will be ready for you to customize.</p>
        <form onSubmit={createWedding} className="mt-7 space-y-5">
          <div><label className="field-label" htmlFor="title">Wedding name</label><input className="field" id="title" name="title" required maxLength={90} /></div>
          <div><label className="field-label" htmlFor="eventDate">Date</label><input className="field" id="eventDate" name="eventDate" type="date" /></div>
          <div><label className="field-label" htmlFor="location">Location</label><input className="field" id="location" name="location" maxLength={120} /></div>
          {error && <p role="alert" className="text-coral">{error}</p>}
          <button className="button button-dark w-full disabled:opacity-50" disabled={busy}>{busy ? "Preparing…" : "Prepare wedding gallery"}</button>
        </form>
      </section>
    </main>
  );
}
