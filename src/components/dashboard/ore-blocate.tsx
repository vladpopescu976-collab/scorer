"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Lock, Phone, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { unblockSeries, unblockSlot } from "@/lib/actions/blocked-slots";
import { cn } from "@/lib/utils";

export type BlocareTeren = {
  id: string;
  startTime: Date;
  endTime: Date;
  reason: string | null;
  clientName: string | null;
  clientPhone: string | null;
  serieId: string | null;
};

type Perioada = "azi" | "saptamana" | "luna" | "toate";
type Fel = "toate" | "telefon" | "privat";

const PERIOADE: { id: Perioada; eticheta: string; zile: number | null }[] = [
  { id: "azi", eticheta: "Azi", zile: 1 },
  { id: "saptamana", eticheta: "7 zile", zile: 7 },
  { id: "luna", eticheta: "30 zile", zile: 30 },
  { id: "toate", eticheta: "Toate", zile: null },
];

const FELURI: { id: Fel; eticheta: string }[] = [
  { id: "toate", eticheta: "Toate" },
  { id: "telefon", eticheta: "Telefon" },
  { id: "privat", eticheta: "Privat" },
];

const ZI = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long" });
const ORA = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" });
const ZI_SCURTA = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short" });
const CHEIE_ZI = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });

const esteTelefon = (b: BlocareTeren) => !!b.clientName?.trim();

/**
 * Orele blocate ale unui teren: pe card doar un rezumat, iar lista, cu filtre
 * (perioada și felul), la cerere. Seriile săptămânale apar o singură dată.
 */
export function OreBlocate({ fieldId, numeTeren, blocari }: { fieldId: string; numeTeren: string; blocari: BlocareTeren[] }) {
  const router = useRouter();
  const [deschis, setDeschis] = useState(false);
  const [perioada, setPerioada] = useState<Perioada>("saptamana");
  const [fel, setFel] = useState<Fel>("toate");
  const [seSterge, startTransition] = useTransition();
  const [acum] = useState(() => Date.now());

  const inUrmatoarele7 = blocari.filter((b) => b.startTime.getTime() < acum + 7 * 86_400_000).length;

  const filtrate = useMemo(() => {
    const zile = PERIOADE.find((p) => p.id === perioada)?.zile ?? null;
    const azi = CHEIE_ZI(new Date(acum));
    const limita = zile ? CHEIE_ZI(new Date(acum + zile * 86_400_000)) : null;
    return blocari
      .filter((b) => b.endTime.getTime() > acum)
      .filter((b) => !limita || CHEIE_ZI(b.startTime) < limita || (zile === 1 && CHEIE_ZI(b.startTime) === azi))
      .filter((b) => (fel === "toate" ? true : fel === "telefon" ? esteTelefon(b) : !esteTelefon(b)))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [blocari, perioada, fel, acum]);

  const serii = useMemo(() => {
    const grupuri = new Map<string, BlocareTeren[]>();
    for (const b of filtrate) if (b.serieId) grupuri.set(b.serieId, [...(grupuri.get(b.serieId) ?? []), b]);
    return [...grupuri.entries()];
  }, [filtrate]);

  const peZile = useMemo(() => {
    const grupuri = new Map<string, BlocareTeren[]>();
    for (const b of filtrate) if (!b.serieId) grupuri.set(CHEIE_ZI(b.startTime), [...(grupuri.get(CHEIE_ZI(b.startTime)) ?? []), b]);
    return [...grupuri.values()];
  }, [filtrate]);

  const oreTotal = Math.round(filtrate.reduce((s, b) => s + (b.endTime.getTime() - b.startTime.getTime()) / 3_600_000, 0));

  function sterge(eticheta: string, actiune: () => Promise<{ ok: boolean; error?: string }>) {
    if (!confirm(eticheta)) return;
    startTransition(async () => {
      const rezultat = await actiune();
      if (!rezultat.ok) return void toast.error(rezultat.error ?? "Nu s-a putut șterge.");
      toast.success("Șters.");
      router.refresh();
    });
  }

  function Iconita({ b }: { b: BlocareTeren }) {
    const telefon = esteTelefon(b);
    return (
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", telefon ? "bg-[#3B82F6]" : "bg-[#8B5CF6]")}>
        {telefon ? <Phone className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDeschis(true)}
        className="flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
      >
        <CalendarClock className="h-4 w-4 text-primary" />
        <span className="text-[13.5px] font-medium">Ore blocate</span>
        <span className="ml-auto text-[12.5px] text-muted-foreground">
          {blocari.length === 0 ? "Nimic blocat" : `${inUrmatoarele7} în următoarele 7 zile`}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ore blocate · {numeTeren}</DialogTitle>
            <DialogDescription>
              {filtrate.length === 0
                ? "Nimic blocat în perioada aleasă."
                : `${filtrate.length} ${filtrate.length === 1 ? "interval" : "intervale"} · ${oreTotal} ${oreTotal === 1 ? "oră" : "ore"} blocate`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Segmente optiuni={PERIOADE} ales={perioada} alege={setPerioada} />
            <Segmente optiuni={FELURI} ales={fel} alege={setFel} />
          </div>

          {serii.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Se repetă</p>
              {serii.map(([serieId, aparitii]) => {
                const prima = aparitii[0];
                const zile = [...new Set(aparitii.map((a) => ZI_SCURTA.format(a.startTime)))].join(", ");
                return (
                  <div key={serieId} className="flex items-center gap-3 rounded-xl border p-3">
                    <Iconita b={prima} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{prima.clientName || prima.reason || "Eveniment privat"}</p>
                      <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Repeat className="h-3 w-3" />
                        {zile} · {ORA.format(prima.startTime)} – {ORA.format(prima.endTime)} · {aparitii.length} {aparitii.length === 1 ? "apariție" : "apariții"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={seSterge}
                      onClick={() => sterge(`Ștergi toată seria (${aparitii.length} apariții viitoare)?`, () => unblockSeries(serieId, fieldId))}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Șterge seria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </section>
          )}

          {peZile.map((grup) => (
            <section key={CHEIE_ZI(grup[0].startTime)} className="space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {ZI.format(grup[0].startTime)}
              </p>
              {grup.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Iconita b={b} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{b.clientName || b.reason || "Eveniment privat"}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {ORA.format(b.startTime)} – {ORA.format(b.endTime)}
                      {b.clientPhone && ` · ${b.clientPhone}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={seSterge}
                    onClick={() => sterge("Ștergi intervalul?", () => unblockSlot(b.id))}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Șterge intervalul"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Segmente<T extends string>({
  optiuni,
  ales,
  alege,
}: {
  optiuni: { id: T; eticheta: string }[];
  ales: T;
  alege: (id: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-muted p-1">
      {optiuni.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => alege(o.id)}
          className={cn(
            "flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-all",
            ales === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.eticheta}
        </button>
      ))}
    </div>
  );
}
