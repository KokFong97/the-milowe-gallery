import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin-auth";
import { findSingleEvent } from "@/lib/event-data";
import { HostEventStudio } from "@/components/host-event-studio";
import { WeddingSetup } from "@/components/wedding-setup";
import { MilloweLogo } from "@/components/millowe-logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The Milowe Gallery - Admin", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getAdminUser();
  if (!user) {
    const { error } = await searchParams;
    return (
      <main className="grid min-h-screen place-items-center bg-sage p-5">
        <section className="panel w-full max-w-lg bg-cream p-8 sm:p-10">
          <MilloweLogo />
          <h1 className="mt-10 font-serif text-4xl">The Milowe Gallery - Admin</h1>
          <p className="mt-4 text-ink/70">Enter the admin password to manage the wedding gallery.</p>
          <form action="/api/admin/login" method="post" className="mt-7 space-y-5">
            <div><label className="field-label" htmlFor="password">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
            {error && <p role="alert" className="text-sm text-[#a63721]">Incorrect password. Please try again.</p>}
            <button className="button button-dark w-full" type="submit">Enter admin</button>
          </form>
        </section>
      </main>
    );
  }
  const event = await findSingleEvent();
  if (!event) return <WeddingSetup />;
  return <HostEventStudio eventId={event.id} />;
}
