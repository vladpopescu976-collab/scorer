import type { LucideIcon } from "lucide-react";
import { Phone } from "lucide-react";

import { AvatarCont } from "@/components/cont/poza-profil";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Piesele comune ale ferestrelor cu detaliile unui anunț. */

export function cand(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function linkTelefon(telefon: string) {
  return `tel:${telefon.replace(/[^\d+]/g, "")}`;
}

/** Antetul verde, ca pe pagina principală: eticheta, titlul și un rând sub el. */
export function AntetDetalii({
  icon: Icon,
  eticheta,
  titlu,
  subtitlu,
  children,
}: {
  icon: LucideIcon;
  eticheta: string;
  titlu: React.ReactNode;
  subtitlu?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,#17543A_0%,#0B2A1C_55%,#07160F_100%)] px-6 pb-6 pt-7 text-[#F3EFE6]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7BD389]/10 blur-3xl" />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset ring-white/15">
        <Icon className="h-3.5 w-3.5" />
        {eticheta}
      </span>
      <DialogTitle className="mt-4 text-[24px] font-semibold leading-tight tracking-tight text-[#F3EFE6] first-letter:uppercase">
        {titlu}
      </DialogTitle>
      {subtitlu && <DialogDescription className="mt-1.5 text-[14px] text-[#F3EFE6]/70">{subtitlu}</DialogDescription>}
      {children}
    </div>
  );
}

/** O căsuță cu o informație: „Când”, „Unde”, „Nivel”… */
export function Info({ icon: Icon, eticheta, children, className }: { icon: LucideIcon; eticheta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-muted/60 p-3.5", className)}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {eticheta}
      </p>
      <div className="mt-1.5 text-[14.5px] font-medium leading-snug first-letter:uppercase">{children}</div>
    </div>
  );
}

export function Titlu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", className)}>{children}</p>;
}

/** Persoana de contact cu butonul mare „Sună”. Fără telefon, un text care spune când apare. */
export function Contact({
  nume,
  poza,
  rol,
  telefon,
  faraTelefon,
}: {
  nume: string;
  poza: string | null;
  rol: string;
  telefon: string | null;
  faraTelefon?: string;
}) {
  return (
    <div className="rounded-2xl border p-3.5">
      <div className="flex items-center gap-3">
        <AvatarCont nume={nume} poza={poza} className="h-11 w-11" textClassName="text-sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-semibold">{nume}</p>
          <p className="text-[12.5px] text-muted-foreground">{rol}</p>
        </div>
        {telefon && (
          <a
            href={linkTelefon(telefon)}
            className="flex items-center gap-1.5 rounded-full bg-[#0E6B3A] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0B5A30]"
          >
            <Phone className="h-4 w-4" />
            Sună
          </a>
        )}
      </div>
      {telefon ? (
        <p className="mt-2.5 text-[13px] text-muted-foreground">
          Telefon: <a href={linkTelefon(telefon)} className="font-medium text-foreground tabular-nums">{telefon}</a>
        </p>
      ) : (
        faraTelefon && <p className="mt-2.5 text-[12.5px] text-muted-foreground">{faraTelefon}</p>
      )}
    </div>
  );
}

/** Rândul de la baza cardului: „Vezi detaliile”. */
export function VeziDetaliile() {
  return (
    <span className="text-[13px] font-semibold text-primary transition-transform group-hover:translate-x-0.5">Vezi detaliile →</span>
  );
}

export const clasaCard =
  "group flex w-full flex-col rounded-3xl border border-black/[0.06] bg-card p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-14px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_44px_-14px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10";

// Butonul „×” stă peste antetul verde: îl facem deschis la culoare, ca să se vadă.
export const clasaFereastra =
  "max-h-[92dvh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-lg [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:bg-white/15 [&>[data-slot=dialog-close]]:text-[#F3EFE6] [&>[data-slot=dialog-close]]:hover:bg-white/25";
