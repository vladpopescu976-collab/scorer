"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Check, Gauge, MapPin, Phone, UserMinus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AvatarCont } from "@/components/cont/poza-profil";
import {
  alaturaMeciAction,
  parasesteMeciAction,
  raspundeCerereAction,
  scoateJucatorAction,
  stergeMeciAction,
} from "@/lib/actions/meciuri";
import { POZITII } from "@/lib/jucatori-liberi-pozitii";
import { sportMeta } from "@/lib/sports";
import type { JucatorInMeci, MeciPublic } from "@/lib/meciuri";
import { cn } from "@/lib/utils";
import { AntetDetalii, Contact, Info, Titlu, VeziDetaliile, cand, clasaCard, clasaFereastra, linkTelefon } from "./detalii";

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începători",
  MEDIU: "Nivel mediu",
  AVANSAT: "Avansați",
  COMPETITIV: "Competitiv",
};

const NIVEL_JUCATOR: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

type Props = { meci: MeciPublic; conectat: boolean; telefonCont?: string };

/** Anunțul unei echipe care caută jucători: cardul din listă și, la apăsare, toate detaliile. */
export function CardMeci(props: Props) {
  const [deschis, setDeschis] = useState(false);
  const { meci } = props;
  const SportIcon = sportMeta[meci.sport].icon;
  const ramase = Math.max(0, meci.jucatoriNecesari - meci.jucatoriAlaturati);
  const procent = Math.min(100, (meci.jucatoriAlaturati / meci.jucatoriNecesari) * 100);
  const stare = meci.esteAlMeu
    ? { text: meci.cereri.length ? `${meci.cereri.length} ${meci.cereri.length === 1 ? "cerere nouă" : "cereri noi"}` : "Anunțul tău", ton: meci.cereri.length ? "amber" : "verde" }
    : meci.cerereaMea === "ACCEPTAT"
      ? { text: "Ești în echipă", ton: "verde" }
      : meci.cerereaMea === "CERERE"
        ? { text: "Cerere trimisă", ton: "amber" }
        : null;

  return (
    <>
      <button type="button" onClick={() => setDeschis(true)} className={clasaCard}>
        <div className="flex w-full items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
            <SportIcon className="h-3.5 w-3.5" />
            {sportMeta[meci.sport].label}
            {meci.format && <span className="tabular-nums">· {meci.format}</span>}
          </span>
          {stare ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                stare.ton === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary"
              )}
            >
              {stare.text}
            </span>
          ) : (
            meci.nivel && <span className="text-[12px] text-muted-foreground">{NIVELURI[meci.nivel]}</span>
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 text-[17px] font-semibold capitalize tracking-tight">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          {cand(meci.inceput)}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[14px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{meci.locatie ? `${meci.locatie}, ${meci.oras}` : meci.oras}</span>
        </p>

        <div className="mt-5 w-full">
          <div className="flex items-center justify-between text-[13px]">
            <span className={cn("font-semibold", ramase === 0 ? "text-muted-foreground" : "text-primary")}>
              {ramase === 0 ? "Echipa e completă" : `Mai ${ramase === 1 ? "trebuie un jucător" : `trebuie ${ramase} jucători`}`}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {meci.jucatoriAlaturati}/{meci.jucatoriNecesari}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#17854A] transition-all" style={{ width: `${procent}%` }} />
          </div>
        </div>

        <div className="mt-5 flex w-full items-center justify-between gap-3 border-t pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <AvatarCont nume={meci.organizator.nume} poza={meci.organizator.poza} className="h-8 w-8" textClassName="text-[11px]" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium">{meci.organizator.nume}</p>
              <p className="text-[12px] text-muted-foreground">organizator</p>
            </div>
          </div>
          <VeziDetaliile />
        </div>
      </button>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent className={clasaFereastra}>
          <DetaliiMeci {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetaliiMeci({ meci, conectat, telefonCont = "" }: Props) {
  const [seLucreaza, startTransition] = useTransition();
  // Cererea cere telefonul: organizatorul te sună dacă nu apari.
  const [cereTelefon, setCereTelefon] = useState(false);
  const [telefon, setTelefon] = useState(telefonCont);
  const [pozitii, setPozitii] = useState<string[]>([]);
  const [nivelAles, setNivelAles] = useState("");
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
    <>
      <AntetDetalii
        icon={SportIcon}
        eticheta={`${sportMeta[meci.sport].label}${meci.format ? ` · ${meci.format}` : ""}`}
        titlu={cand(meci.inceput)}
        subtitlu={meci.locatie ? `${meci.locatie}, ${meci.oras}` : meci.oras}
      >
        <div className="mt-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[#7BD389]">
              {complet ? "Echipa e completă" : `Mai ${ramase === 1 ? "trebuie un jucător" : `trebuie ${ramase} jucători`}`}
            </span>
            <span className="tabular-nums text-[#F3EFE6]/70">
              {meci.jucatoriAlaturati}/{meci.jucatoriNecesari}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#7BD389]" style={{ width: `${procent}%` }} />
          </div>
        </div>
      </AntetDetalii>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Info icon={MapPin} eticheta="Unde">
            {meci.locatie ?? "Se stabilește"}
            <span className="block text-[13px] font-normal text-muted-foreground">{meci.oras}</span>
          </Info>
          <Info icon={Gauge} eticheta="Nivel">
            {meci.nivel ? NIVELURI[meci.nivel] : "Oricine"}
          </Info>
        </div>

        {meci.descriere && (
          <div>
            <Titlu>De la organizator</Titlu>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/85">{meci.descriere}</p>
          </div>
        )}

        <div className="space-y-2">
          <Titlu>Organizator</Titlu>
          <Contact
            nume={meci.organizator.nume}
            poza={meci.organizator.poza}
            rol={meci.esteAlMeu ? "tu" : "organizator"}
            telefon={meci.esteAlMeu ? null : meci.telefonOrganizator}
            faraTelefon={meci.esteAlMeu ? undefined : "Telefonul organizatorului apare aici după ce te acceptă în echipă."}
          />
        </div>

        {meci.cerereaMea === "CERERE" && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-[13.5px] font-medium text-amber-700 dark:text-amber-400">
            Cererea ta așteaptă răspunsul organizatorului.
          </p>
        )}
        {meci.cerereaMea === "ACCEPTAT" && (
          <p className="rounded-xl bg-primary/10 px-3 py-2.5 text-[13.5px] font-medium text-primary">Ești în echipă! Sună-l pe organizator dacă ai întrebări.</p>
        )}
        {meci.cerereaMea === "RESPINS" && (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-[13.5px] text-muted-foreground">Organizatorul a ales alți jucători.</p>
        )}

        {meci.esteAlMeu && meci.cereri.length > 0 && (
          <div className="space-y-2.5 rounded-2xl bg-amber-500/5 p-3.5 ring-1 ring-amber-500/20">
            <Titlu className="text-amber-700 dark:text-amber-400">Vor să vină · {meci.cereri.length}</Titlu>
            {meci.cereri.map((j) => (
              <RandJucator key={j.id} j={j}>
                <button
                  type="button"
                  disabled={seLucreaza || complet}
                  title={complet ? "Ai deja toți jucătorii" : "Îl iei în echipă"}
                  onClick={() => ruleaza(() => raspundeCerereAction(meci.id, j.id, true), `${j.nume} e în echipă.`)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0E6B3A] text-white disabled:opacity-40"
                  aria-label={`Acceptă-l pe ${j.nume}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={seLucreaza}
                  onClick={() => ruleaza(() => raspundeCerereAction(meci.id, j.id, false), "Cererea a fost refuzată.")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-destructive"
                  aria-label={`Refuză-l pe ${j.nume}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </RandJucator>
            ))}
          </div>
        )}

        {meci.jucatori.length > 0 && (
          <div className="space-y-2.5">
            <Titlu>În echipă · {meci.jucatori.length}</Titlu>
            {meci.jucatori.map((j) => (
              <RandJucator key={j.id} j={j}>
                {meci.esteAlMeu && (
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
                )}
              </RandJucator>
            ))}
          </div>
        )}

        {cereTelefon && !meci.cerereaMea && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ruleaza(
                () => alaturaMeciAction(meci.id, { telefon, pozitii, nivel: nivelAles || undefined }),
                "Cererea a fost trimisă. Organizatorul alege echipa."
              );
              setCereTelefon(false);
            }}
            className="space-y-3 rounded-2xl bg-muted/60 p-4"
          >
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" htmlFor={`tel-${meci.id}`}>
                Telefon (obligatoriu)
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
            </div>
            {POZITII[meci.sport].length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-medium">Pe ce poziție joci?</p>
                <div className="flex flex-wrap gap-1.5">
                  {POZITII[meci.sport].map((p) => {
                    const ales = pozitii.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPozitii(ales ? pozitii.filter((x) => x !== p) : [...pozitii, p])}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                          ales ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium">Nivelul tău</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(NIVEL_JUCATOR).map(([id, eticheta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNivelAles(nivelAles === id ? "" : id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                      nivelAles === id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40"
                    )}
                  >
                    {eticheta}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Telefonul îl vede doar organizatorul. El alege pe cine ia; primești o notificare.
            </p>
            <Button type="submit" className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza || !telefon.trim()}>
              Trimite cererea
            </Button>
          </form>
        )}

        {meci.esteAlMeu ? (
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            disabled={seLucreaza}
            onClick={() => {
              if (confirm("Ștergi anunțul? Jucătorii din echipă nu-l vor mai vedea.")) {
                ruleaza(() => stergeMeciAction(meci.id), "Anunțul a fost șters.");
              }
            }}
          >
            Șterge anunțul
          </Button>
        ) : meci.cerereaMea === "ACCEPTAT" || meci.cerereaMea === "CERERE" ? (
          <Button
            variant="outline"
            className="h-11 w-full rounded-full"
            disabled={seLucreaza}
            onClick={() => ruleaza(() => parasesteMeciAction(meci.id), meci.cerereaMea === "ACCEPTAT" ? "Ai ieșit din meci." : "Ți-ai retras cererea.")}
          >
            {meci.cerereaMea === "ACCEPTAT" ? "Ies din meci" : "Retrag cererea"}
          </Button>
        ) : meci.cerereaMea === "RESPINS" || cereTelefon ? null : !conectat ? (
          <Button className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" nativeButton={false} render={<Link href="/autentificare" />}>
            <Users className="h-4 w-4" />
            Vreau să vin
          </Button>
        ) : (
          <Button className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza || complet} onClick={() => setCereTelefon(true)}>
            <Users className="h-4 w-4" />
            {complet ? "Echipa e completă" : "Vreau să vin"}
          </Button>
        )}
      </div>
    </>
  );
}

/** Un rând cu jucătorul: nume, poziții, nivel și telefon (doar organizatorul îl vede). */
function RandJucator({ j, children }: { j: JucatorInMeci; children?: React.ReactNode }) {
  const detalii = [j.pozitii.join(", "), j.nivel ? NIVEL_JUCATOR[j.nivel] : ""].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-2.5">
      <AvatarCont nume={j.nume} poza={j.poza} className="h-9 w-9" textClassName="text-[11px]" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13.5px] font-medium">{j.nume}</p>
        {detalii && <p className="truncate text-[12px] text-muted-foreground">{detalii}</p>}
        {j.telefon && (
          <a href={linkTelefon(j.telefon)} className="flex items-center gap-1 text-[12.5px] text-primary">
            <Phone className="h-3 w-3" />
            {j.telefon}
          </a>
        )}
      </div>
      {children}
    </div>
  );
}
