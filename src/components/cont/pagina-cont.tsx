import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import type { PreferredTime, Role, SkillLevel, SportType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZonaPericuloasa } from "@/components/cont/zona-periculoasa";
import { SchimbaDate } from "@/components/cont/schimba-date";
import { PozaProfil } from "@/components/cont/poza-profil";
import { sportMeta } from "@/lib/sports";

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

const INTERVALE: Record<string, string> = {
  DIMINEATA: "Dimineața",
  PRANZ: "La prânz",
  DUPA_AMIAZA: "După-amiaza",
  SEARA: "Seara",
  WEEKEND: "În weekend",
};

export type DateCont = {
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  city: string | null;
  sports: SportType[];
  birthDate: Date | null;
  skillLevel: SkillLevel | null;
  preferredTimes: PreferredTime[];
  companyName: string | null;
  website: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
  image: string | null;
  _count: { bookings: number; fields: number; reviews: number };
};

/** Pagina „Contul meu”: antet, contact și securitate, profil, zonă periculoasă. */
export function PaginaCont({ user }: { user: DateCont }) {
  const esteBusiness = user.role === "BUSINESS";

  // Datele de profil; emailul, telefonul și parola au secțiunea lor, cu schimbare.
  const randuri: { eticheta: string; valoare: string }[] = [
    ...(user.city ? [{ eticheta: "Oraș", valoare: user.city }] : []),
  ];

  if (esteBusiness) {
    if (user.companyName) randuri.push({ eticheta: "Firmă", valoare: user.companyName });
    if (user.website) randuri.push({ eticheta: "Site", valoare: user.website });
    randuri.push({ eticheta: "Terenuri publicate", valoare: String(user._count.fields) });
  } else {
    if (user.birthDate) {
      randuri.push({
        eticheta: "Data nașterii",
        valoare: user.birthDate.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
      });
    }
    if (user.skillLevel) randuri.push({ eticheta: "Nivel", valoare: NIVELURI[user.skillLevel] });
    if (user.preferredTimes.length) {
      randuri.push({
        eticheta: "Când joacă",
        valoare: user.preferredTimes.map((interval) => INTERVALE[interval]).join(", "),
      });
    }
    randuri.push({ eticheta: "Rezervări", valoare: String(user._count.bookings) });
  }
  randuri.push({
    eticheta: "Mesaje de marketing",
    valoare: user.marketingOptIn ? "Acceptate" : "Refuzate",
  });

  const membruDin = user.createdAt.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  const securitate: { eticheta: string; valoare: string; pictograma: typeof Mail; tip: "email" | "telefon" | "parola" }[] = [
    { eticheta: "Email", valoare: user.email, pictograma: Mail, tip: "email" },
    { eticheta: "Telefon", valoare: user.phone || "Nesetat", pictograma: Phone, tip: "telefon" },
    { eticheta: "Parolă", valoare: "••••••••••", pictograma: KeyRound, tip: "parola" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6 text-muted-foreground"
        nativeButton={false}
        render={<Link href={esteBusiness ? "/dashboard/business" : "/"} />}
      >
        <ArrowLeft className="h-4 w-4" />
        {esteBusiness ? "Înapoi la panou" : "Înapoi pe site"}
      </Button>

      <div className="space-y-12">
        {/* Antet: poza, numele și tipul contului, centrate și aerisite. */}
        <section className="flex flex-col items-center text-center">
          <PozaProfil nume={user.name} poza={user.image} />
          <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{user.name}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{user.email}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 font-medium text-primary">
              {esteBusiness ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
              {esteBusiness ? "Cont Business" : "Cont Personal"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Membru din {membruDin}
            </span>
          </div>
        </section>

        {/* Date de contact și securitate: fiecare se schimbă cu confirmare. */}
        <Sectiune titlu="Contact și securitate" nota="Orice schimbare cere parola actuală și un cod primit pe email.">
          <ul className="divide-y">
            {securitate.map((rand) => (
              <li key={rand.tip} className="flex items-center gap-4 px-5 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <rand.pictograma className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-muted-foreground">{rand.eticheta}</p>
                  <p className="truncate text-[15px] font-medium">{rand.valoare}</p>
                </div>
                <SchimbaDate tip={rand.tip} nume={user.name} email={user.email} />
              </li>
            ))}
          </ul>
        </Sectiune>

        <Sectiune titlu="Profil">
          <dl className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2">
            {randuri.map((rand) => (
              <div key={rand.eticheta} className="space-y-1">
                <dt className="text-[13px] text-muted-foreground">{rand.eticheta}</dt>
                <dd className="text-[15px] font-medium">{rand.valoare}</dd>
              </div>
            ))}
            {!esteBusiness && user.sports.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <dt className="text-[13px] text-muted-foreground">Sporturi preferate</dt>
                <dd className="flex flex-wrap gap-2">
                  {user.sports.map((sport) => (
                    <Badge key={sport} variant="secondary" className="rounded-full px-3 py-1 text-sm">
                      {sportMeta[sport].label}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Sectiune>

        <ZonaPericuloasa esteBusiness={esteBusiness} />
      </div>
    </div>
  );
}

function Sectiune({ titlu, nota, children }: { titlu: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{titlu}</h2>
      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.08)] dark:border-white/10">
        {children}
      </div>
      {nota && <p className="px-1 text-[13px] text-muted-foreground">{nota}</p>}
    </section>
  );
}
