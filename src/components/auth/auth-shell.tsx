import Link from "next/link";
import { SemnScorer } from "@/components/semn-scorer";

/**
 * Fundalul și logo-ul paginilor de autentificare. Culorile sunt cele ale
 * temei (`primary`, `accent`), deci se schimbă singure în modul întunecat.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="auth-blob absolute -left-24 top-[4%] h-[420px] w-[420px] rounded-full bg-primary/20 blur-[90px]" />
        <span
          className="auth-blob absolute -right-24 bottom-[2%] h-[480px] w-[480px] rounded-full bg-accent blur-[90px]"
          style={{ animationDelay: "-6s" }}
        />
        <span
          className="auth-blob absolute left-[42%] top-[48%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px]"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      <div className="w-full max-w-lg space-y-6">
        <Link href="/" aria-label="Scorer, pagina principală" className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] text-white shadow-lg shadow-primary/30 ring-4 ring-background/70">
            <SemnScorer className="h-9 w-9" />
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}

/** Suprafața de sticlă pe care stau formularele. */
export const CARD_AUTH =
  "rounded-3xl border border-white/60 bg-card/75 shadow-xl shadow-primary/10 backdrop-blur-xl dark:border-white/10 [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:border-border/80 [&_[data-slot=input]]:bg-background/80 [&_[data-slot=input]]:text-base [&_[data-slot=input]]:shadow-xs [&_[data-slot=input]]:placeholder:text-muted-foreground/70 sm:[&_[data-slot=input]]:text-[15px] [&_[data-slot=input]:not([data-cu-icon])]:px-4 [&_[data-slot=form-item]]:gap-2.5 [&_[data-slot=form-label]]:text-[15px] [&_[data-slot=form-label]]:font-medium [&_[data-slot=form-description]]:text-[13.5px] [&_[data-slot=form-message]]:text-[13.5px] [&_[data-slot=form-description]]:leading-relaxed [&_[data-slot=card-content]]:px-6 sm:[&_[data-slot=card-content]]:px-8";
