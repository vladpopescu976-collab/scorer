"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Clock, MapPin, Phone, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AvatarCont } from "@/components/cont/poza-profil";
import { invitaJucatorAction, seteazaInvitatiiAction, stergeAnuntJucatorAction } from "@/lib/actions/meciuri";
import type { AnuntJucatorPublic } from "@/lib/jucatori-liberi";
import { sportMeta } from "@/lib/sports";
import { textDisponibilitate } from "@/lib/jucatori-liberi-pozitii";
import { localDateTimeToIso } from "@/lib/datetime";

const DURATE = [60, 90, 120];

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

const camp = "h-10 w-full rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-primary";

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
  const [teren, setTeren] = useState("");
  const [data, setData] = useState("");
  const [ora, setOra] = useState("");
  const [durata, setDurata] = useState(60);
  const [pret, setPret] = useState("");
  const [scrieMesaj, setScrieMesaj] = useState(false);
  const SportIcon = sportMeta[anunt.sport].icon;

  function invita() {
    startTransition(async () => {
      const dataOra = data && ora ? localDateTimeToIso(data, ora) : null;
      if (teren.trim().length < 2) return void toast.error("Spune pe ce teren jucați.");
      if (!dataOra) return void toast.error("Alege data și ora meciului.");
      const r = await invitaJucatorAction(anunt.id, {
        teren: teren.trim(),
        dataOra,
        durata,
        pret: pret === "" ? null : Math.max(0, Math.round(Number(pret))),
        mesaj: mesaj.trim() || null,
      });
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

      {textDisponibilitate(anunt.zile, anunt.oraDe, anunt.oraPana) && (
        <p className="mt-3 flex items-center gap-2 text-[14px] font-medium">
          <CalendarClock className="h-4 w-4 text-primary" />
          Disponibil: {textDisponibilitate(anunt.zile, anunt.oraDe, anunt.oraPana)}
        </p>
      )}
      {anunt.descriere && <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">{anunt.descriere}</p>}

      <div className="mt-auto pt-5">
        {anunt.esteAlMeu ? (
          <div className="space-y-3">
            {/* Doar jucătorul decide când nu mai vrea invitații. */}
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3">
              <span>
                <span className="block text-[14px] font-medium">Primesc invitații</span>
                <span className="block text-[12px] text-muted-foreground">
                  {anunt.primesteInvitatii ? "Oricâte echipe te pot invita." : "Oprit: echipele nu te mai pot invita."}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={anunt.primesteInvitatii}
                disabled={seLucreaza}
                onClick={() =>
                  startTransition(async () => {
                    const r = await seteazaInvitatiiAction(anunt.id, !anunt.primesteInvitatii);
                    if (!r.ok) toast.error(r.error);
                  })
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${anunt.primesteInvitatii ? "bg-[#17854A]" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${anunt.primesteInvitatii ? "left-6" : "left-1"}`} />
              </button>
            </label>
            {anunt.invitatii.length > 0 ? (
              <div className="space-y-2 rounded-2xl bg-primary/5 p-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-primary">Te vor în echipă</p>
                {anunt.invitatii.map((i) => (
                  <div key={i.id} className="flex items-start gap-2.5">
                    <AvatarCont nume={i.nume} poza={i.poza} className="h-8 w-8" textClassName="text-[11px]" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13.5px] font-medium">{i.nume}</p>
                      {i.teren && (
                        <p className="flex items-center gap-1 truncate text-[12px] text-foreground/80">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {i.teren}
                        </p>
                      )}
                      {i.dataOra && (
                        <p className="flex items-center gap-1 text-[12px] text-foreground/80">
                          <Clock className="h-3 w-3 shrink-0" />
                          {cand(i.dataOra)}
                          {i.durata ? ` · ${i.durata} min` : ""}
                        </p>
                      )}
                      {i.pret != null && (
                        <p className="flex items-center gap-1 text-[12px] text-foreground/80">
                          <Wallet className="h-3 w-3 shrink-0" />
                          {i.pret === 0 ? "Gratis" : `${i.pret} lei de om`}
                        </p>
                      )}
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
        ) : !anunt.primesteInvitatii ? (
          <p className="rounded-xl bg-muted py-2.5 text-center text-[13.5px] text-muted-foreground">
            Nu primește invitații momentan
          </p>
        ) : !conectat ? (
          <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" nativeButton={false} render={<Link href="/autentificare" />}>
            <UserPlus className="h-4 w-4" />
            Ia-l în echipă
          </Button>
        ) : scrieMesaj ? (
          <div className="space-y-2.5 rounded-2xl bg-muted/50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Detaliile meciului</p>
            <input
              value={teren}
              onChange={(e) => setTeren(e.target.value)}
              maxLength={120}
              placeholder="Terenul, ex. Baza Sportivă Olimpia"
              className={camp}
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" className={camp} />
              <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} aria-label="Ora" className={camp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={durata} onChange={(e) => setDurata(Number(e.target.value))} aria-label="Durata" className={camp}>
                {DURATE.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={pret}
                onChange={(e) => setPret(e.target.value)}
                placeholder="Lei de om (opț.)"
                className={camp}
              />
            </div>
            <input
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              maxLength={300}
              placeholder="Alte detalii (opțional), ex. adu tricou alb"
              className={camp}
            />
            <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza} onClick={invita}>
              Trimite invitația
            </Button>
          </div>
        ) : (
          <Button className="w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" onClick={() => setScrieMesaj(true)}>
            <UserPlus className="h-4 w-4" />
            Ia-l în echipă
          </Button>
        )}
      </div>
    </article>
  );
}
