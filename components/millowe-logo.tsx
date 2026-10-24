import Link from "next/link";
import { Camera } from "lucide-react";

export function MilloweLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${inverse ? "text-cream" : "text-forest"}`}>
      <span className={`grid ${compact ? "h-8 w-8" : "h-10 w-10"} place-items-center rounded-full ${inverse ? "bg-cream text-forest" : "bg-forest text-cream"}`}>
        <Camera className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={2.2} />
      </span>
      <span className="font-serif text-lg tracking-[-0.02em] sm:text-xl">The Milowe Gallery</span>
    </Link>
  );
}

