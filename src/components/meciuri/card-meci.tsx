"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Phone, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AvatarCont } from "@/components/cont/poza-profil";
import { alaturaMeciAction, parasesteMeciAction, scoateJucatorAction, stergeMeciAction } from "@/lib/actions/meciuri";
import { sportMeta } from "@/lib/sports";
import type { MeciPublic } from "@/lib/meciuri";
import { cn } from "@/lib/utils";

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începători",
  MEDIU: "Nivel mediu",
  AVANSAT: "Avansați",
  COMPETITIV: "Competitiv",
};

function cand(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CardMeci({ meci, conectat, telefonCont = "" }: { meci: MeciPublic; conectat: boolean; telefonCont?: string }) {
  const [seLucreaza, startTransition] = useTransition();
  // Alăturarea cere telefonul: organizatorul te sună dacă nu apari.
  const [cereTelefon, setCereTelefon] = useState(false);
  const [telefon, setTelefon] = useState(telefonCont);
  const SportIcon = sportMeta[meci.sport].icon;
  const ramase = Math.max(0, meci.jucatoriNecesari - meci.jucatoriAlaturati);
  const complet = ramase === 0;
  const procent = Math.min(100, (meci.jucatoriAlaturati / meci.jucatoriNecesari) * 100);

  function ruleaza(actiune: () => Promise<{ ok: boolean; error?: string }>, mesaj: string) {
    startTransition(async () => {
      const rezultat = await actiune();
      if (!rezultat.ok) toast.error(rezultat.error ?? "Nu a mers. Încearcă din nou.");
      else toast.success(mesaj);
    });
  }

  return (
    <article className="flex flex-col rounded-3xl border border-black/[0.06] bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-14px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_44px_-14px_rgba(0,0,0,0.18)] dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
          <SportIcon className="h-3.5 w-3.5" />
          {sportMeta[meci.sport].label}
          {meci.format && <span className="tabular-nums">· {meci.format}</span>}
        </span>
        {meci.nivel && <span className="text-[12px] text-muted-foreground">{NIVELURI[meci.nivel]}</span>}
      </div>

      <p className="mt-4 flex items-center gap-2 text-[17px] font-semibold capitalize tracking-tight">
        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        {cand(meci.inceput)}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-[14px] text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        {meci.locatie ? `${meci.locatie}, ${meci.oras}` : meci.oras}
      </p>
      {meci.descriere && <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">{meci.descriere}</p>}

      <div className="mt-5">
        <div className="flex items-center justify-between text-[13px]">
          <span className={cn("font-semibold", complet ? "text-muted-foreground" : "text-primary")}>
            {complet ? "Echipa e completă" : `Mai ${ramase === 1 ? "trebuie un jucător" : `trebuie ${ramase} jucători`}`}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {meci.jucatoriAlaturati}/{meci.jucatoriNecesari}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[#17854A] transition-all" style={{ width: `${procent}%` }} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <AvatarCont nume={meci.organizator.nume} poza={meci.organizator.poza} className="h-8 w-8" textClassName="text-[11px]" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium">{meci.organizator.nume}</p>
            <p className="text-[12px] text-muted-foreground">organizator</p>
          </div>
          {meci.jucatori.length > 0 && (
            <div className="ml-1 flex -space-x-2">
              {meci.jucatori.slice(0, 4).map((j) => (
                <AvatarCont key={j.id} nume={j.nume} poza={j.poza} className="h-7 w-7 ring-2 ring-card" textClassName="text-[10px]" />
              ))}
            </div>
          )}
        </div>

        {meci.esteAlMeu ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={seLucreaza}
            onClick={() => ruleaza(() => stergeMeciAction(meci.id), "Anunțul a fost șters.")}
          >
            Șterge
          </Button>
        ) : meci.mAmAlaturat ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={seLucreaza}
            onClick={() => ruleaza(() => parasesteMeciAction(meci.id), "Ai ieșit din meci.")}
          >
            Ies din meci
          </Button>
        ) : !conectat ? (
          <Button size="sm" className="rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" nativeButton={false} render={<Link href="/autentificare" />}>
            <Users className="h-4 w-4" />
            Mă alătur
          </Button>
        ) : (
          <Button
            size="sm"
            className="rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]"
            disabled={seLucreaza || complet}
            onClick={() => setCereTelefon(true)}
          >
            <Users className="h-4 w-4" />
            {complet ? "Complet" : "Mă alătur"}
          </Button>
        )}
      </div>

      {cereTelefon && !meci.mAmAlaturat && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ruleaza(() => alaturaMeciAction(meci.id, telefon), "Te-ai alăturat meciului!");
            setCereTelefon(false);
          }}
          className="mt-4 space-y-2 rounded-2xl bg-muted/60 p-3"
        >
          <label className="text-[13px] font-medium" htmlFor={`tel-${meci.id}`}>
            Numărul tău de telefon (obligatoriu)
          </label>
          <input
            id={`tel-${meci.id}`}
            type="tel"
            required
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="07xx xxx xxx"
            className="h-10 w-full rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-primary"
          />
          <p className="text-[12px] text-muted-foreground">Îl vede doar organizatorul, ca să te poată suna dacă nu ajungi.</p>
          <Button type="submit" size="sm" className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza || !telefon.trim()}>
            Confirm, vin la meci
          </Button>
        </form>
      )}

      {meci.esteAlMeu && meci.jucatori.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl bg-primary/5 p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-primary">Cine vine</p>
          {meci.jucatori.map((j) => (
            <div key={j.id} className="flex items-center gap-2.5">
              <AvatarCont nume={j.nume} poza={j.poza} className="h-8 w-8" textClassName="text-[11px]" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13.5px] font-medium">{j.nume}</p>
                {j.telefon && (
                  <a href={`tel:${j.telefon.replace(/\s/g, "")}`} className="flex items-center gap-1 text-[12.5px] text-primary">
                    <Phone className="h-3 w-3" />
                    {j.telefon}
                  </a>
                )}
              </div>
              <button
                type="button"
                disabled={seLucreaza}
                onClick={() => {
                  if (confirm(`Îl scoți pe ${j.nume} din meci? Locul se eliberează pentru altcineva.`)) {
                    ruleaza(() => scoateJucatorAction(meci.id, j.id), `${j.nume} a fost scos din meci.`);
                  }
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Scoate
              </button>
            </div>
          ))}
        </div>
      )}

      {meci.telefonOrganizator && (
        <a
          href={`tel:${meci.telefonOrganizator.replace(/\s/g, "")}`}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-[14px] font-medium text-primary"
        >
          <Phone className="h-4 w-4" />
          Sună organizatorul: {meci.telefonOrganizator}
        </a>
      )}
    </article>
  );
}
