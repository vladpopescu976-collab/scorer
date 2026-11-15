import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, UserSearch } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listaMeciuri } from "@/lib/meciuri";
import { AntetMeciuri } from "@/components/meciuri/antet-meciuri";
import { FiltreMeciuri } from "@/components/meciuri/filtre-meciuri";
import { CardMeci } from "@/components/meciuri/card-meci";
import { PosteazaMeci } from "@/components/meciuri/posteaza-meci";
import { CardJucatorLiber } from "@/components/meciuri/card-jucator-liber";
import { PuneAnuntJucator } from "@/components/meciuri/pune-anunt-jucator";
import { listaJucatoriLiberi } from "@/lib/jucatori-liberi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Găsește meci — Scorer" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function GasesteMeciPage({
  searchParams,
}: {
  searchParams: Promise<{ oras?: string; sport?: string; sectiune?: string }>;
}) {
  const { oras = "", sport = "", sectiune = "" } = await searchParams;
  // Două secțiuni: echipele care caută jucători și jucătorii care caută echipă.
  const cautaEchipa = sectiune === "echipa";
  const sesiune = await auth();
  const userId = sesiune?.user?.id ?? null;
  const estePersonal = sesiune?.user?.role === "PERSONAL";

  const [meciuri, jucatori, eu] = await Promise.all([
    cautaEchipa ? Promise.resolve([]) : listaMeciuri({ oras, sport }, userId),
    cautaEchipa ? listaJucatoriLiberi({ oras, sport }, userId) : Promise.resolve([]),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { city: true } }) : null,
  ]);

  return (
    <>
      <AntetMeciuri
        eticheta="Găsește meci"
        titlu="Lipsește cineva?"
        accent="Intră în joc."
        descriere="Alege orașul și vezi cine mai are nevoie de jucători. Sau pune tu un anunț, când îți lipsesc oameni."
      >
        <div className="mb-6 inline-flex rounded-full bg-white/10 p-1 ring-1 ring-inset ring-white/15">
          {[
            { id: "", eticheta: "Caută jucători" },
            { id: "echipa", eticheta: "Caută echipă" },
          ].map((t) => {
            const params = new URLSearchParams();
            if (oras) params.set("oras", oras);
            if (sport) params.set("sport", sport);
            if (t.id) params.set("sectiune", t.id);
            const activ = (t.id === "echipa") === cautaEchipa;
            return (
              <Link
                key={t.id}
                href={`/gaseste-meci${params.size ? `?${params}` : ""}`}
                className={cn(
                  "rounded-full px-5 py-2 text-[14px] font-semibold transition-colors",
                  activ ? "bg-[#F3EFE6] text-[#07160F]" : "text-[#F3EFE6]/75 hover:text-[#F3EFE6]"
                )}
              >
                {t.eticheta}
              </Link>
            );
          })}
        </div>
        <FiltreMeciuri cale="/gaseste-meci" oras={oras} sport={sport} pastreaza={cautaEchipa ? { sectiune: "echipa" } : {}} />
        <div className="mt-6 flex flex-wrap gap-3">
          {estePersonal ? (
            cautaEchipa ? (
              <PuneAnuntJucator orasImplicit={oras || eu?.city || ""} />
            ) : (
              <PosteazaMeci orasImplicit={oras || eu?.city || ""} />
            )
          ) : (
            !userId && (
              <Button
                className="h-11 rounded-full bg-[#F3EFE6] px-5 text-[15px] font-semibold text-[#07160F] hover:bg-white"
                nativeButton={false}
                render={<Link href="/autentificare" />}
              >
                Conectează-te ca să pui un anunț
              </Button>
            )
          )}
        </div>
      </AntetMeciuri>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {cautaEchipa ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {jucatori.length === 0
                ? "Niciun jucător pe listă deocamdată"
                : `${jucatori.length} ${jucatori.length === 1 ? "jucător caută" : "jucători caută"} echipă${oras ? ` în ${oras}` : ""}`}
            </p>
            {jucatori.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserSearch className="h-6 w-6" />
                </span>
                <p className="mt-4 font-medium">Niciun jucător nu caută echipă{oras ? ` în ${oras}` : ""}</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Cauți tu echipă? Apasă „Caut echipă” și spune ce poziție joci.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {jucatori.map((a) => (
                  <CardJucatorLiber key={a.id} anunt={a} conectat={estePersonal} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {meciuri.length === 0
                ? "Niciun meci deocamdată"
                : `${meciuri.length} ${meciuri.length === 1 ? "echipă caută" : "echipe caută"} jucători${oras ? ` în ${oras}` : ""}`}
            </p>
            {meciuri.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="h-6 w-6" />
                </span>
                <p className="mt-4 font-medium">Nicio echipă nu caută jucători{oras ? ` în ${oras}` : ""}</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Îți lipsesc oameni? Pune un anunț și ceilalți se pot alătura imediat.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {meciuri.map((m) => (
                  <CardMeci key={m.id} meci={m} conectat={estePersonal} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
