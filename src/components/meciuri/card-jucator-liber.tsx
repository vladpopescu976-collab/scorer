"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Clock, Gauge, MapPin, MessageSquareText, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AvatarCont } from "@/components/cont/poza-profil";
import { invitaJucatorAction, seteazaInvitatiiAction, stergeAnuntJucatorAction } from "@/lib/actions/meciuri";
import type { AnuntJucatorPublic } from "@/lib/jucatori-liberi";
import { sportMeta } from "@/lib/sports";
import { textDisponibilitate } from "@/lib/jucatori-liberi-pozitii";
import { localDateTimeToIso } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { AntetDetalii, Contact, Info, Titlu, VeziDetaliile, cand, clasaCard, clasaFereastra } from "./detalii";

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Nivel mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

const DURATE = [60, 90, 120];

const camp = "h-10 w-full rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-primary";

type Props = { anunt: AnuntJucatorPublic; conectat: boolean; telefonCont?: string };
type Invitatie = AnuntJucatorPublic["invitatii"][number];

/** Un jucător care caută echipă: cardul din listă și, la apăsare, toate detaliile. */
export function CardJucatorLiber(props: Props) {
  const [deschis, setDeschis] = useState(false);
  const { anunt } = props;
  const SportIcon = sportMeta[anunt.sport].icon;
  const disponibil = textDisponibilitate(anunt.zile, anunt.oraDe, anunt.oraPana);
  const stare = anunt.esteAlMeu
    ? anunt.invitatii.length
      ? `${anunt.invitatii.length} ${anunt.invitatii.length === 1 ? "invitație" : "invitații"}`
      : "Anunțul tău"
    : anunt.lAmInvitat
      ? "L-ai invitat"
      : null;

  return (
    <>
      <button type="button" onClick={() => setDeschis(true)} className={clasaCard}>
        <div className="flex w-full items-center gap-3.5">
          <AvatarCont nume={anunt.jucator.nume} poza={anunt.jucator.poza} className="h-14 w-14" textClassName="text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{anunt.jucator.nume}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {anunt.oras}
              {anunt.nivel && ` · ${NIVELURI[anunt.nivel]}`}
            </p>
          </div>
          {stare && <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">{stare}</span>}
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

        {disponibil && (
          <p className="mt-3 flex items-center gap-2 text-[14px] font-medium">
            <CalendarClock className="h-4 w-4 text-primary" />
            {disponibil}
          </p>
        )}

        <div className="mt-auto flex w-full justify-end pt-5">
          <VeziDetaliile />
        </div>
      </button>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent className={clasaFereastra}>
          <DetaliiJucator {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetaliiJucator({ anunt, conectat, telefonCont = "" }: Props) {
  const [seLucreaza, startTransition] = useTransition();
  const [scrieInvitatie, setScrieInvitatie] = useState(false);
  const [teren, setTeren] = useState("");
  const [data, setData] = useState("");
  const [ora, setOra] = useState("");
  const [durata, setDurata] = useState(60);
  const [pret, setPret] = useState("");
  const [telefon, setTelefon] = useState(telefonCont);
  const [mesaj, setMesaj] = useState("");
  const SportIcon = sportMeta[anunt.sport].icon;
  const disponibil = textDisponibilitate(anunt.zile, anunt.oraDe, anunt.oraPana);

  function invita() {
    const dataOra = data && ora ? localDateTimeToIso(data, ora) : null;
    if (teren.trim().length < 2) return void toast.error("Spune pe ce teren jucați.");
    if (!dataOra) return void toast.error("Alege data și ora meciului.");
    if (!telefon.trim()) return void toast.error("Lasă un număr de telefon, ca jucătorul să te poată suna.");
    startTransition(async () => {
      const r = await invitaJucatorAction(anunt.id, {
        teren: teren.trim(),
        dataOra,
        durata,
        pret: pret === "" ? null : Math.max(0, Math.round(Number(pret))),
        telefon: telefon.trim(),
        mesaj: mesaj.trim() || null,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`L-ai invitat pe ${anunt.jucator.nume}. A primit o notificare.`);
      setScrieInvitatie(false);
    });
  }

  return (
    <>
      <AntetDetalii
        icon={SportIcon}
        eticheta={`Caută echipă · ${sportMeta[anunt.sport].label}`}
        titlu={anunt.jucator.nume}
        subtitlu={[anunt.oras, anunt.nivel ? NIVELURI[anunt.nivel] : null].filter(Boolean).join(" · ")}
      >
        {anunt.pozitii.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {anunt.pozitii.map((p) => (
              <span key={p} className="rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium ring-1 ring-inset ring-white/15">
                {p}
              </span>
            ))}
          </div>
        )}
      </AntetDetalii>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Info icon={CalendarClock} eticheta="Disponibil" className="col-span-2">
            {disponibil ?? "Oricând"}
          </Info>
          <Info icon={MapPin} eticheta="Oraș">{anunt.oras}</Info>
          <Info icon={Gauge} eticheta="Nivel">{anunt.nivel ? NIVELURI[anunt.nivel] : "Nespus"}</Info>
        </div>

        {anunt.descriere && (
          <div>
            <Titlu>Despre {anunt.esteAlMeu ? "tine" : "el"}</Titlu>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/85">{anunt.descriere}</p>
          </div>
        )}

        {anunt.esteAlMeu ? (
          <>
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

            <div className="space-y-2.5">
              <Titlu>Te vor în echipă · {anunt.invitatii.length}</Titlu>
              {anunt.invitatii.length > 0 ? (
                anunt.invitatii.map((i) => <CardInvitatie key={i.id} i={i} />)
              ) : (
                <p className="text-[13.5px] text-muted-foreground">Nicio invitație încă. Te anunțăm când te vrea o echipă.</p>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
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
          </>
        ) : anunt.lAmInvitat ? (
          <div className="space-y-2">
            <p className="rounded-xl bg-primary/10 px-3 py-2.5 text-[13.5px] font-medium text-primary">L-ai invitat. A primit o notificare cu detaliile.</p>
            <Contact
              nume={anunt.jucator.nume}
              poza={anunt.jucator.poza}
              rol="jucător"
              telefon={anunt.telefonJucator}
              faraTelefon="Jucătorul nu și-a arătat telefonul. Te sună el pe numărul tău."
            />
          </div>
        ) : !anunt.primesteInvitatii ? (
          <p className="rounded-xl bg-muted py-3 text-center text-[13.5px] text-muted-foreground">Nu primește invitații momentan</p>
        ) : !conectat ? (
          <Button className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" nativeButton={false} render={<Link href="/autentificare" />}>
            <UserPlus className="h-4 w-4" />
            Ia-l în echipă
          </Button>
        ) : scrieInvitatie ? (
          <div className="space-y-2.5 rounded-2xl bg-muted/60 p-4">
            <Titlu>Detaliile meciului</Titlu>
            <input value={teren} onChange={(e) => setTeren(e.target.value)} maxLength={120} placeholder="Terenul, ex. Baza Sportivă Olimpia" className={camp} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" className={camp} />
              <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} aria-label="Ora" className={camp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={durata} onChange={(e) => setDurata(Number(e.target.value))} aria-label="Durata" className={camp}>
                {DURATE.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
              <input type="number" inputMode="numeric" min={0} value={pret} onChange={(e) => setPret(e.target.value)} placeholder="Lei de om (opț.)" className={camp} />
            </div>
            <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="Telefonul tău, ex. 07xx xxx xxx" aria-label="Telefonul tău" className={camp} />
            <input value={mesaj} onChange={(e) => setMesaj(e.target.value)} maxLength={300} placeholder="Alte detalii (opțional), ex. adu tricou alb" className={camp} />
            <p className="text-[12px] text-muted-foreground">Jucătorul vede detaliile și numărul tău, ca să te poată suna.</p>
            <Button className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" disabled={seLucreaza} onClick={invita}>
              Trimite invitația
            </Button>
          </div>
        ) : (
          <Button className="h-11 w-full rounded-full bg-[#0E6B3A] hover:bg-[#0B5A30]" onClick={() => setScrieInvitatie(true)}>
            <UserPlus className="h-4 w-4" />
            Ia-l în echipă
          </Button>
        )}
      </div>
    </>
  );
}

/** O invitație primită: cine te cheamă, unde, când, cât costă și butonul „Sună”. */
function CardInvitatie({ i }: { i: Invitatie }) {
  return (
    <div className="space-y-3 rounded-2xl bg-primary/5 p-3.5 ring-1 ring-primary/10">
      <Contact nume={i.nume} poza={i.poza} rol="te cheamă în echipă" telefon={i.telefon} />
      <div className={cn("grid gap-2", i.pret != null ? "grid-cols-2" : "grid-cols-1")}>
        {i.teren && (
          <Info icon={MapPin} eticheta="Teren" className="col-span-full bg-background">
            {i.teren}
          </Info>
        )}
        {i.dataOra && (
          <Info icon={Clock} eticheta="Când" className="bg-background">
            {cand(i.dataOra)}
            {i.durata ? <span className="block text-[13px] font-normal text-muted-foreground">{i.durata} min</span> : null}
          </Info>
        )}
        {i.pret != null && (
          <Info icon={Wallet} eticheta="Preț" className="bg-background">
            {i.pret === 0 ? "Gratis" : `${i.pret} lei de om`}
          </Info>
        )}
        {i.mesaj && (
          <Info icon={MessageSquareText} eticheta="Alte detalii" className="col-span-full bg-background">
            {i.mesaj}
          </Info>
        )}
      </div>
    </div>
  );
}
