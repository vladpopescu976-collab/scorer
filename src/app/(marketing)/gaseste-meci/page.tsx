import type { Metadata } from "next";
import Link from "next/link";
import { Search, Trophy } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listaMeciuri } from "@/lib/meciuri";
import { AntetMeciuri } from "@/components/meciuri/antet-meciuri";
import { FiltreMeciuri } from "@/components/meciuri/filtre-meciuri";
import { CardMeci } from "@/components/meciuri/card-meci";
import { PosteazaMeci } from "@/components/meciuri/posteaza-meci";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Găsește meci — Scorer" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function GasesteMeciPage({
  searchParams,
}: {
  searchParams: Promise<{ oras?: string; sport?: string }>;
}) {
  const { oras = "", sport = "" } = await searchParams;
  const sesiune = await auth();
  const userId = sesiune?.user?.id ?? null;
  const estePersonal = sesiune?.user?.role === "PERSONAL";

  const [meciuri, eu] = await Promise.all([
    listaMeciuri({ oras, sport }, userId),
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
        <FiltreMeciuri cale="/gaseste-meci" oras={oras} sport={sport} />
        <div className="mt-6 flex flex-wrap gap-3">
          {estePersonal ? (
            <PosteazaMeci orasImplicit={oras || eu?.city || ""} />
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
          <Button
            variant="outline"
            className="h-11 rounded-full border-[#F3EFE6]/30 bg-transparent px-5 text-[15px] text-[#F3EFE6] hover:bg-[#F3EFE6]/10 hover:text-[#F3EFE6]"
            nativeButton={false}
            render={<Link href={`/gaseste-meci/jucatori${oras ? `?oras=${encodeURIComponent(oras)}` : ""}`} />}
          >
            <Search className="h-4 w-4" />
            Caută jucători
          </Button>
        </div>
      </AntetMeciuri>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="mb-6 text-sm text-muted-foreground">
          {meciuri.length === 0
            ? "Niciun meci deocamdată"
            : `${meciuri.length} ${meciuri.length === 1 ? "meci caută" : "meciuri caută"} jucători${oras ? ` în ${oras}` : ""}`}
        </p>
        {meciuri.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </span>
            <p className="mt-4 font-medium">Niciun meci care să caute jucători{oras ? ` în ${oras}` : ""}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Fii primul: pune un anunț și ceilalți se pot alătura imediat.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {meciuri.map((m) => (
              <CardMeci key={m.id} meci={m} conectat={estePersonal} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
