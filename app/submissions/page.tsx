import { WelcomeSplash } from "@/components/welcome-splash";
import { GuestEvent } from "@/components/guest-event";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <WelcomeSplash><GuestEvent key={category ?? "all"} view="submissions" initialCategory={category ?? "all"} /></WelcomeSplash>;
}
