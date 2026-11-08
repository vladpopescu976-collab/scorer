import Link from "next/link";

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

      <div className="w-full max-w-md space-y-6">
        <Link href="/" aria-label="Scorer, pagina principală" className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 font-heading text-2xl font-semibold text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background/70">
            S
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}

/** Suprafața de sticlă pe care stau formularele. */
export const CARD_AUTH =
  "rounded-3xl border border-white/60 bg-card/75 shadow-xl shadow-primary/10 backdrop-blur-xl dark:border-white/10 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:text-base";
