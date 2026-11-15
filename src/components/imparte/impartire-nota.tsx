"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarClock, Check, Copy, Crown, MapPin, Send, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AvatarCont } from "@/components/cont/poza-profil";
import { DialogPlataCard } from "@/components/plata/plata-card";
import { platesteParteaAction } from "@/lib/actions/bookings";
import type { ImpartireApi } from "@/lib/impartire-plata";
import { lei } from "@/lib/impartire-calcul";
import { sportMeta } from "@/lib/sports";
import { cn } from "@/lib/utils";

function cand(inceput: string, sfarsit: string) {
  const o = { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" } as const;
  const zi = new Date(inceput).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long" });
  return `${zi}, ${new Date(inceput).toLocaleTimeString("ro-RO", o)}–${new Date(sfarsit).toLocaleTimeString("ro-RO", o)}`;
}

function candAPlatit(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "acum";
  if (min < 60) return `acum ${min} min`;
  return new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Inelul cu câți au plătit din câți. */
function Inel({ platite, total }: { platite: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(243,239,230,.12)" strokeWidth="7" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#7BD389"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - platite / total) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[22px] font-semibold tabular-nums">
          {platite}
          <span className="text-[14px] text-[#F3EFE6]/55">/{total}</span>
        </span>
        <span className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F3EFE6]/55">plătit</span>
      </div>
    </div>
  );
}

/** Split the bill: cine a plătit, cât mai e și butonul pentru partea ta. */
export function ImpartireNota({ date, conectat, estePersonal }: { date: ImpartireApi; conectat: boolean; estePersonal: boolean }) {
  const router = useRouter();
  const [plata, setPlata] = useState(false);
  const [seLucreaza, startTransition] = useTransition();
  const [copiat, setCopiat] = useState(false);
  const SportIcon = sportMeta[date.teren.sport as keyof typeof sportMeta]?.icon ?? Users;
  const libere = Math.max(0, date.numarParti - date.platite);
  const complet = libere === 0;
  const procentBani = Math.min(100, (date.colectat / date.total) * 100);

  async function trimiteLinkul() {
    const text = `Hai la meci! ${date.teren.nume}, ${cand(date.inceput, date.sfarsit)}. Partea ta: ${lei(date.sumaParte)} RON.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Split the bill · Scorer", text, url: date.link });
        return;
      } catch {
        // Anulat: copiem linkul mai jos.
      }
    }
    await copiaza();
  }

  async function copiaza() {
    await navigator.clipboard.writeText(date.link);
    setCopiat(true);
    toast.success("Linkul a fost copiat.");
    setTimeout(() => setCopiat(false), 2000);
  }

  function dupaPlata() {
    startTransition(async () => {
      const r = await platesteParteaAction(date.cod);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Ți-ai plătit partea. Organizatorul a primit o notificare.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {/* Antetul: terenul, ora și inelul cu cine a plătit. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_120%_at_0%_0%,#17543A_0%,#0B2A1C_55%,#07160F_100%)] p-6 text-[#F3EFE6] shadow-[0_30px_60px_-30px_rgba(7,22,15,.7)]"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#7BD389]/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ring-white/15">
              <SportIcon className="h-3.5 w-3.5" />
              Split the bill
            </span>
            <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight">{date.teren.nume}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-[14px] capitalize text-[#F3EFE6]/75">
              <CalendarClock className="h-4 w-4 shrink-0" />
              {cand(date.inceput, date.sfarsit)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[#F3EFE6]/75">
              <MapPin className="h-4 w-4 shrink-0" />
              {date.teren.oras}
            </p>
          </div>
          <Inel platite={date.platite} total={date.numarParti} />
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-2">
          {[
            { eticheta: "Fiecare", valoare: lei(date.sumaParte) },
            { eticheta: "Strâns", valoare: lei(date.colectat) },
            { eticheta: "Rămas", valoare: lei(date.ramas) },
          ].map((c) => (
            <div key={c.eticheta} className="rounded-2xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-inset ring-white/10">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F3EFE6]/55">{c.eticheta}</p>
              <p className="mt-0.5 text-[17px] font-semibold tabular-nums">
                {c.valoare} <span className="text-[11px] font-medium text-[#F3EFE6]/55">RON</span>
              </p>
            </div>
          ))}
        </div>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[#7BD389]"
            initial={{ width: 0 }}
            animate={{ width: `${procentBani}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>

      {/* Acțiunea principală, după cine se uită. */}
      <div className="mt-5">
        {date.inchisa ? (
          <p className="rounded-2xl bg-muted px-4 py-3.5 text-center text-[14px] text-muted-foreground">
            Rezervarea a fost anulată. Nu mai e nimic de plătit.
          </p>
        ) : date.esteOrganizator ? (
          <div className="space-y-2.5">
            <Button onClick={trimiteLinkul} className="h-12 w-full rounded-2xl bg-[#0E6B3A] text-[15px] hover:bg-[#0B5A30]">
              <Send className="h-4 w-4" />
              Trimite linkul prietenilor
            </Button>
            <button
              type="button"
              onClick={copiaza}
              className="flex w-full items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-left text-[13px] transition-colors hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{date.link}</span>
              {copiat ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        ) : date.amPlatit ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-3.5 text-[14.5px] font-semibold text-primary">
            <Check className="h-4 w-4" />
            Ți-ai plătit partea. Ne vedem pe teren!
          </p>
        ) : complet ? (
          <p className="rounded-2xl bg-primary/10 px-4 py-3.5 text-center text-[14px] font-medium text-primary">Nota e plătită integral.</p>
        ) : !conectat ? (
          <Button
            className="h-12 w-full rounded-2xl bg-[#0E6B3A] text-[15px] hover:bg-[#0B5A30]"
            nativeButton={false}
            render={<Link href="/autentificare" />}
            onClick={() => {
              document.cookie = `inapoi=/imparte/${date.cod}; path=/; max-age=900; samesite=lax`;
            }}
          >
            Conectează-te și plătește {lei(date.sumaParte)} RON
          </Button>
        ) : !estePersonal ? (
          <p className="rounded-2xl bg-muted px-4 py-3.5 text-center text-[14px] text-muted-foreground">
            Partea se plătește dintr-un cont de jucător.
          </p>
        ) : date.potPlati ? (
          <Button
            onClick={() => setPlata(true)}
            disabled={seLucreaza}
            className="h-12 w-full rounded-2xl bg-[#0E6B3A] text-[15px] hover:bg-[#0B5A30]"
          >
            Plătește partea ta · {lei(date.sumaParte)} RON
          </Button>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3.5 text-center text-[14px] text-muted-foreground">Meciul a început deja.</p>
        )}
      </div>

      {/* Lista: organizatorul primul, apoi cine a plătit, apoi locurile libere. */}
      <div className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cine a plătit</p>
          <p className="text-[12.5px] text-muted-foreground tabular-nums">
            {date.platite} din {date.numarParti}
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-18px_rgba(0,0,0,0.14)] dark:border-white/10">
          {date.parti.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className={cn("flex items-center gap-3 px-4 py-3.5", i > 0 && "border-t")}
            >
              <div className="relative">
                <AvatarCont nume={p.nume} poza={p.poza} className="h-11 w-11" textClassName="text-[13px]" />
                {p.esteOrganizator && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C243] ring-2 ring-card">
                    <Crown className="h-3 w-3 text-[#5A3E00]" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[15px] font-semibold">
                  {p.nume}
                  {p.eu && <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">(tu)</span>}
                </p>
                <p className={cn("mt-0.5 text-[12.5px]", p.esteOrganizator ? "font-semibold text-[#B7791F]" : "text-muted-foreground")}>
                  {p.esteOrganizator ? "Organizator" : `Plătit ${candAPlatit(p.platitLa)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold tabular-nums">{lei(p.suma)} RON</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary">
                  <Check className="h-3 w-3" /> Plătit
                </p>
              </div>
            </motion.div>
          ))}
          {Array.from({ length: Math.min(libere, 4) }).map((_, i) => (
            <div key={`liber-${i}`} className="flex items-center gap-3 border-t px-4 py-3.5">
              <span className="h-11 w-11 rounded-full border-2 border-dashed border-muted-foreground/25" />
              <div className="flex-1 leading-tight">
                <p className="text-[15px] font-medium text-muted-foreground">Loc liber</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground/80">Așteaptă plata</p>
              </div>
              <p className="text-[15px] font-medium tabular-nums text-muted-foreground">{lei(date.sumaParte)} RON</p>
            </div>
          ))}
          {libere > 4 && (
            <p className="border-t px-4 py-3 text-center text-[13px] text-muted-foreground">
              încă {libere - 4} {libere - 4 === 1 ? "loc liber" : "locuri libere"}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
        Mod demonstrativ: nu se debitează nimic.
      </p>

      <DialogPlataCard deschis={plata} laInchidere={() => setPlata(false)} suma={date.sumaParte} laPlata={dupaPlata} />
    </div>
  );
}
