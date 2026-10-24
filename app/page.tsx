import { WelcomeSplash } from "@/components/welcome-splash";
import { GuestEvent } from "@/components/guest-event";

export const dynamic = "force-dynamic";

export default function WeddingGalleryPage() {
  return <WelcomeSplash><GuestEvent /></WelcomeSplash>;
}

