import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Banda verde de sus a paginilor, în stilul primei pagini: etichetă mică,
 * titlu mare cu un accent în serif italic (semnătura Scorer) și o descriere.
 */
export function AntetPagina({
  eticheta,
  titlu,
  accent,
  descriere,
  children,
}: {
  eticheta: string;
  titlu: string;
  accent?: string;
  descriere?: string;
  children?: React.ReactNode;
}) {
  return (
    // Urcă sub bara de sus (care devine transparentă) și se termină cu colțuri
    // rotunjite, ca banda din aplicație: pe telefon, site-ul și aplicația arată la fel.
    <section className="relative -mt-16 overflow-hidden rounded-b-[32px] bg-[radial-gradient(120%_120%_at_0%_0%,#17543A_0%,#0B2A1C_50%,#07160F_100%)] text-[#F3EFE6] shadow-[0_24px_60px_-30px_rgba(7,22,15,0.65)] sm:rounded-b-[48px]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[200px] rotate-[-24deg] bg-gradient-to-b from-[#F3EFE6]/[0.12] to-transparent blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#7BD389]/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-32 lg:px-8">
        <p className="text-[13px] font-medium text-[#F3EFE6]/60">{eticheta}</p>
        <h1 className="mt-3 text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.2rem]">
          {titlu}
          {accent && <> <span className="font-display font-normal italic text-[#F3EFE6]/60">{accent}</span></>}
        </h1>
        {descriere && <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#F3EFE6]/65">{descriere}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/** Titlul paginilor din panoul business: mare, cu accent în serif italic. */
export function TitluPanou({ titlu, accent, className }: { titlu: string; accent?: string; className?: string }) {
  return (
    <h1 className={`text-[26px] font-semibold leading-tight tracking-[-0.03em] first-letter:uppercase ${className ?? ""}`}>
      {titlu}
      {accent && <> <span className="font-display text-[24px] font-normal italic text-muted-foreground">{accent}</span></>}
    </h1>
  );
}

/** Starea goală: când nu e nimic de arătat, o invitație caldă în loc de un gol. */
export function StareGoala({
  icon: Icon,
  titlu,
  text,
  actiune,
}: {
  icon: LucideIcon;
  titlu: string;
  text: string;
  actiune?: { eticheta: string; href: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-[radial-gradient(90%_120%_at_50%_0%,rgba(14,107,58,0.08),transparent_70%)] px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0E6B3A,#2FA560)] text-white shadow-[0_12px_30px_-10px_rgba(14,107,58,0.6)]">
        <Icon className="h-7 w-7" />
      </div>
      <p className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">
        {titlu}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{text}</p>
      {actiune && (
        <Link
          href={actiune.href}
          className="mt-7 inline-flex h-11 items-center rounded-full bg-primary px-6 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#0B5A30]"
        >
          {actiune.eticheta}
        </Link>
      )}
    </div>
  );
}

/**
 * Rândul de sporturi de pe banda verde, ca în aplicație: iconiță, nume și o
 * linie verde-lime sub cel ales. Păstrează restul filtrelor din adresă.
 */
export function CategoriiSport({
  cale,
  activ,
  parametri,
  sporturi,
}: {
  cale: string;
  activ: string;
  parametri: Record<string, string>;
  sporturi: { value: string; label: string; icon: LucideIcon }[];
}) {
  function link(sport: string) {
    const p = new URLSearchParams(Object.entries(parametri).filter(([k, v]) => v && k !== "sport" && k !== "dimensiune"));
    if (sport) p.set("sport", sport);
    return `${cale}${p.size ? `?${p}` : ""}`;
  }
  const toate = [{ value: "", label: "Toate", icon: null as LucideIcon | null }, ...sporturi];
  return (
    <nav aria-label="Sporturi" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-7">
        {toate.map((s) => {
          const ales = activ === s.value;
          const Icon = s.icon;
          return (
            <li key={s.value || "toate"}>
              <Link
                href={link(s.value)}
                className={`flex flex-col items-center gap-2 text-[12.5px] font-medium transition-colors ${ales ? "text-[#F3EFE6]" : "text-[#F3EFE6]/55 hover:text-[#F3EFE6]/85"}`}
              >
                {Icon ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="grid h-5 w-5 grid-cols-2 gap-[3px] p-[1px]">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="rounded-[2px] border-[1.5px] border-current" />
                    ))}
                  </span>
                )}
                <span className="whitespace-nowrap">{s.label}</span>
                <span className={`h-[3px] w-full rounded-full ${ales ? "bg-[#7BD389]" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
