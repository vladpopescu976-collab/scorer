"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { SportType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { posteazaMeci as posteazaMeciAction } from "@/lib/actions/meciuri";
import { localDateTimeToIso } from "@/lib/datetime";
import { formatePentru } from "@/lib/formate-teren";
import { sportOptions } from "@/lib/sports";
import { cn } from "@/lib/utils";

const NIVELURI = [
  { id: "", eticheta: "Oricine" },
  { id: "INCEPATOR", eticheta: "Începători" },
  { id: "MEDIU", eticheta: "Mediu" },
  { id: "AVANSAT", eticheta: "Avansați" },
] as const;

/** „Mai am nevoie de jucători”: formularul de anunț. */
export function PosteazaMeci({ orasImplicit }: { orasImplicit: string }) {
  const [deschis, setDeschis] = useState(false);
  const [seTrimite, startTransition] = useTransition();
  const [sport, setSport] = useState<SportType>("FOOTBALL");
  const [format, setFormat] = useState("");
  const [oras, setOras] = useState(orasImplicit);
  const [data, setData] = useState("");
  const [ora, setOra] = useState("19:00");
  const [locatie, setLocatie] = useState("");
  const [necesari, setNecesari] = useState(2);
  const [nivel, setNivel] = useState("");
  const [descriere, setDescriere] = useState("");
  const [arataTelefon, setArataTelefon] = useState(true);
  const [eroare, setEroare] = useState("");

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    const inceput = data && ora ? localDateTimeToIso(data, ora) : null;
    if (!inceput) return setEroare("Alege data și ora meciului.");
    startTransition(async () => {
      const rezultat = await posteazaMeciAction({
        sport,
        oras,
        inceput,
        locatie: locatie || undefined,
        format: format || undefined,
        jucatoriNecesari: necesari,
        nivel: (nivel || undefined) as "INCEPATOR" | "MEDIU" | "AVANSAT" | undefined,
        descriere: descriere || undefined,
        arataTelefon,
      });
      if (!rezultat.ok) return setEroare(rezultat.error);
      toast.success("Anunțul a fost publicat.");
      setDeschis(false);
    });
  }

  const formate = formatePentru(sport);

  return (
    <>
      <Button
        onClick={() => setDeschis(true)}
        className="h-11 rounded-full bg-[#F3EFE6] px-5 text-[15px] font-semibold text-[#07160F] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] hover:bg-white"
      >
        <Plus className="h-4 w-4" />
        Caut jucători
      </Button>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">Mai ai nevoie de jucători?</DialogTitle>
            <DialogDescription>Anunțul apare celor din orașul tău, iar ei se pot alătura cu un clic.</DialogDescription>
          </DialogHeader>

          <form onSubmit={trimite} className="space-y-5 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl">
            <div className="space-y-2">
              <Label>Sport</Label>
              <div className="flex flex-wrap gap-2">
                {sportOptions.filter((s) => s.value !== "OTHER").map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => { setSport(s.value); setFormat(""); }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      sport === s.value ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {formate.length > 0 && (
              <div className="space-y-2">
                <Label>Dimensiune (opțional)</Label>
                <div className="flex flex-wrap gap-2">
                  {formate.map((f) => (
                    <button
                      key={f.cod}
                      type="button"
                      onClick={() => setFormat(format === f.cod ? "" : f.cod)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-[13px] font-semibold tabular-nums transition-colors",
                        format === f.cod ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"
                      )}
                    >
                      {f.cod}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meci-data">Data</Label>
                <Input id="meci-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meci-ora">Ora</Label>
                <Input id="meci-ora" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meci-oras">Oraș</Label>
                <Input id="meci-oras" value={oras} onChange={(e) => setOras(e.target.value)} placeholder="ex. Timișoara" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meci-locatie">Teren / adresă</Label>
                <Input id="meci-locatie" value={locatie} onChange={(e) => setLocatie(e.target.value)} placeholder="ex. Arena Bega" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Câți jucători mai cauți?</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setNecesari((n) => Math.max(1, n - 1))}>−</Button>
                <span className="w-10 text-center text-xl font-semibold tabular-nums">{necesari}</span>
                <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setNecesari((n) => Math.min(30, n + 1))}>+</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nivel</Label>
              <div className="flex flex-wrap gap-2">
                {NIVELURI.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNivel(n.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      nivel === n.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"
                    )}
                  >
                    {n.eticheta}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meci-descriere">Detalii (opțional)</Label>
              <Textarea id="meci-descriere" value={descriere} onChange={(e) => setDescriere(e.target.value)} placeholder="ex. Împărțim prețul terenului, aduceți tricou alb și negru." maxLength={400} />
            </div>

            <label className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5 text-[14px]">
              <input type="checkbox" checked={arataTelefon} onChange={(e) => setArataTelefon(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E6B3A]" />
              <span>Arată numărul meu de telefon celor care se alătură</span>
            </label>

            {eroare && <p className="text-sm text-destructive">{eroare}</p>}
            <Button type="submit" disabled={seTrimite} className="h-12 w-full rounded-xl bg-[#0E6B3A] text-[15px] hover:bg-[#0B5A30]">
              {seTrimite ? "Se publică…" : "Publică anunțul"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
