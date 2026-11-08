import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import type { PreferredTime, Role, SkillLevel, SportType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZonaPericuloasa } from "@/components/cont/zona-periculoasa";
import { SchimbaDate } from "@/components/cont/schimba-date";
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

  const initiale = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((bucata) => bucata[0]?.toUpperCase())
    .join("");
  const membruDin = user.createdAt.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  const securitate: { eticheta: string; valoare: string; pictograma: typeof Mail; tip: "email" | "telefon" | "parola" }[] = [
    { eticheta: "Email", valoare: user.email, pictograma: Mail, tip: "email" },
    { eticheta: "Telefon", valoare: user.phone || "Nesetat", pictograma: Phone, tip: "telefon" },
    { eticheta: "Parolă", valoare: "••••••••••", pictograma: KeyRound, tip: "parola" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4"
        nativeButton={false}
        render={<Link href={esteBusiness ? "/dashboard/business" : "/"} />}
      >
        <ArrowLeft className="h-4 w-4" />
        {esteBusiness ? "Înapoi la panou" : "Înapoi pe site"}
      </Button>

      <div className="space-y-5">
        {/* Antet: cine ești, dintr-o privire. */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] p-6 text-white shadow-xl shadow-primary/20 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold ring-1 ring-white/30 backdrop-blur sm:h-20 sm:w-20 sm:text-3xl">
              {initiale || <UserRound className="h-8 w-8" />}
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
              <p className="truncate text-sm text-white/80">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
                  {esteBusiness ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                  {esteBusiness ? "Cont Business" : "Cont Personal"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Membru din {membruDin}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Date de contact și securitate: fiecare se schimbă cu confirmare. */}
        <section className="rounded-3xl border bg-card p-2 shadow-sm">
          <div className="flex items-center gap-2 px-4 pb-2 pt-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Contact și securitate</h2>
          </div>
          <p className="px-4 pb-3 text-sm text-muted-foreground">
            Orice schimbare cere parola actuală și un cod primit pe email.
          </p>
          <ul className="divide-y">
            {securitate.map((rand) => (
              <li key={rand.tip} className="flex items-center gap-4 px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <rand.pictograma className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{rand.eticheta}</p>
                  <p className="truncate text-[15px] font-medium">{rand.valoare}</p>
                </div>
                <SchimbaDate tip={rand.tip} nume={user.name} email={user.email} />
              </li>
            ))}
          </ul>
        </section>

        {/* Profil */}
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold">Profil</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {randuri.map((rand) => (
              <div key={rand.eticheta} className="space-y-1">
                <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {rand.eticheta === "Oraș" && <MapPin className="h-3.5 w-3.5" />}
                  {rand.eticheta}
                </dt>
                <dd className="text-[15px] font-medium">{rand.valoare}</dd>
              </div>
            ))}
          </dl>

          {!esteBusiness && user.sports.length > 0 && (
            <div className="mt-6 space-y-2.5">
              <p className="text-sm text-muted-foreground">Sporturi preferate</p>
              <div className="flex flex-wrap gap-2">
                {user.sports.map((sport) => (
                  <Badge key={sport} variant="secondary" className="rounded-full px-3 py-1 text-sm">
                    {sportMeta[sport].label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        <ZonaPericuloasa esteBusiness={esteBusiness} />
      </div>
    </div>
  );
}
