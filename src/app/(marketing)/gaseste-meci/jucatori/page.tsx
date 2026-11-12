import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, UserSearch } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cautaJucatori } from "@/lib/meciuri";
import { sportMeta } from "@/lib/sports";
import { AntetMeciuri } from "@/components/meciuri/antet-meciuri";
import { FiltreMeciuri } from "@/components/meciuri/filtre-meciuri";
import { Vizibilitate } from "@/components/meciuri/vizibilitate";
import { AvatarCont } from "@/components/cont/poza-profil";

export const metadata: Metadata = { title: "Caută jucători — Scorer" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

export default async function JucatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ oras?: string; sport?: string; nume?: string }>;
}) {
  const { oras = "", sport = "", nume = "" } = await searchParams;
  const sesiune = await auth();
  const estePersonal = sesiune?.user?.role === "PERSONAL";

  const [jucatori, eu] = await Promise.all([
    cautaJucatori({ oras, sport, nume }),
    estePersonal
      ? prisma.user.findUnique({ where: { id: sesiune!.user.id }, select: { vizibilInCautare: true } })
      : null,
  ]);

  return (
    <>
      <AntetMeciuri
        eticheta="Găsește meci · Jucători"
        titlu="Caută jucători"
        accent="din orașul tău."
        descriere="Apar aici doar cei care au ales să fie găsiți. Vezi ce sporturi joacă și la ce nivel."
      >
        <Link href="/gaseste-meci" className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-[#F3EFE6]/70 hover:text-[#F3EFE6]">
          <ArrowLeft className="h-4 w-4" />
          Înapoi la meciuri
        </Link>
        <FiltreMeciuri cale="/gaseste-meci/jucatori" oras={oras} sport={sport} cuNume nume={nume} />
        {estePersonal && (
          <div className="mt-6">
            <Vizibilitate vizibil={eu?.vizibilInCautare ?? false} />
          </div>
        )}
      </AntetMeciuri>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {jucatori.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserSearch className="h-6 w-6" />
            </span>
            <p className="mt-4 font-medium">Niciun jucător găsit</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Încearcă alt oraș sau alt sport. Jucătorii apar aici doar dacă au ales asta.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jucatori.map((j) => (
              <article
                key={j.id}
                className="flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_30px_-14px_rgba(0,0,0,0.12)] dark:border-white/10"
              >
                <AvatarCont nume={j.nume} poza={j.poza} className="h-14 w-14" textClassName="text-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{j.nume}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                    {j.oras && (<><MapPin className="h-3.5 w-3.5" />{j.oras}</>)}
                    {j.nivel && <span>{j.oras ? " · " : ""}{NIVELURI[j.nivel]}</span>}
                  </p>
                  {j.sporturi.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {j.sporturi.map((s) => (
                        <span key={s} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-medium text-primary">
                          {sportMeta[s].label}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
