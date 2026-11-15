"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AvatarCont } from "@/components/cont/poza-profil";
import { invitaJucatorAction, stergeAnuntJucatorAction } from "@/lib/actions/meciuri";
import type { AnuntJucatorPublic } from "@/lib/jucatori-liberi";
import { sportMeta } from "@/lib/sports";

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Nivel mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

/** Un jucător care caută echipă; echipele îl pot invita. */
export function CardJucatorLiber({ anunt, conectat }: { anunt: AnuntJucatorPublic; conectat: boolean }) {
  const [seLucreaza, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState("");
  const [scrieMesaj, setScrieMesaj] = useState(false);
  const SportIcon = sportMeta[anunt.sport].icon;

  function invita() {
    startTransition(async () => {
      const r = await invitaJucatorAction(anunt.id, mesaj || undefined);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`L-ai invitat pe ${anunt.jucator.nume}. A primit o notificare.`);
      setScrieMesaj(false);
    });
  }

  return (
    <article className="flex flex-col rounded-3xl border border-black/[0.06] bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-14px_rgba(0,0,0,0.12)] dark:border-white/10">
      <div className="flex items-center gap-3.5">
        <AvatarCont nume={anunt.jucator.nume} poza={anunt.jucator.poza} className="h-14 w-14" textClassName="text-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">
            {anunt.jucator.nume}
            {anunt.esteAlMeu && <span className="ml-2 text-[12px] font-medium text-primary">anunțul tău</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {anunt.oras}
            {anunt.nivel && ` · ${NIVELURI[anunt.nivel]}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
          <SportIcon className="h-3.5 w-3.5" />
          {sportMeta[anunt.sport].label}
        </span>
        {anunt.pozitii.map((p) => (
          <span key={p} className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium">
            {p}
          </span>
        ))}
      </div>

      {anunt.descriere && <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">{anunt.descriere}</p>}

      <div className="mt-auto pt-5">
        {anunt.esteAlMeu ? (
          <div className="space-y-3">
            {anunt.invitatii.length > 0 ? (
              <div className="space-y-2 rounded-2xl bg-primary/5 p-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-primary">Te vor în echipă</p>
                {anunt.invitatii.map((i) => (
                  <div key={i.id} className="flex items-center gap-2.5">
                    <AvatarCont nume={i.nume} poza={i.poza} className="h-8 w-8" textClassName="text-[11px]" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13.5px] font-medium">{i.nume}</p>
                      {i.mesaj && <p className="truncate text-[12px] text-muted-foreground">„{i.mesaj}”</p>}
                    </div>
                    {i.telefon && (
                      <a href={`tel:${i.telefon.replace(/\s/g, "")}`} className="flex items-center gap-1 text-[13px] font-medium text-primary">
                        <Phone className="h-3.5 w-3.5" />
                        {i.telefon}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Nicio invitație încă. Te anunțăm când te vrea o echipă.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={seLucreaza}
              onClick={() =>
                startTransition(async () => {
                  const r = await stergeAnuntJucatorAction(anunt.id);
                  if (!r.ok) toast.error(r.error);
                })
              }
            >
              Scoate anunțul
            </Button>
          </div>
        ) : anunt.lAmInvitat ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-primary">L-ai invitat. A primit o notificare.</p>
            {anunt.telefonJucator && (
              <a
                href={`tel:${anunt.telefonJucator.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-[14px] font-medium text-primary"
              >
                <Phone className="h-4 w-4" />
                Sună-l: {anunt.telefonJucator}
              </a>
            )}
          </div>
        ) : !conectat ? (
          <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" nativeButton={false} render={<Link href="/autentificare" />}>
            <UserPlus className="h-4 w-4" />
            Vreau în echipă
          </Button>
        ) : scrieMesaj ? (
          <div className="space-y-2">
            <input
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              maxLength={300}
              placeholder="Mesaj (opțional), ex. Jucăm joi la 20:00"
              className="h-10 w-full rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-primary"
            />
            <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza} onClick={invita}>
              Trimite invitația
            </Button>
          </div>
        ) : (
          <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" onClick={() => setScrieMesaj(true)}>
            <UserPlus className="h-4 w-4" />
            Vreau în echipă
          </Button>
        )}
      </div>
    </article>
  );
}
