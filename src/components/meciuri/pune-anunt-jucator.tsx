"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { SportType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salveazaAnuntJucatorAction } from "@/lib/actions/meciuri";
import { POZITII } from "@/lib/jucatori-liberi-pozitii";
import { sportOptions } from "@/lib/sports";
import { cn } from "@/lib/utils";

const NIVELURI = [
  { id: "", eticheta: "Nu spun" },
  { id: "INCEPATOR", eticheta: "Începător" },
  { id: "MEDIU", eticheta: "Mediu" },
  { id: "AVANSAT", eticheta: "Avansat" },
  { id: "COMPETITIV", eticheta: "Competitiv" },
] as const;

/** „Caut echipă”: jucătorul își pune anunțul. */
export function PuneAnuntJucator({ orasImplicit }: { orasImplicit: string }) {
  const [deschis, setDeschis] = useState(false);
  const [seTrimite, startTransition] = useTransition();
  const [sport, setSport] = useState<SportType>("FOOTBALL");
  const [pozitii, setPozitii] = useState<string[]>([]);
  const [oras, setOras] = useState(orasImplicit);
  const [nivel, setNivel] = useState("");
  const [descriere, setDescriere] = useState("");
  const [arataTelefon, setArataTelefon] = useState(true);
  const [eroare, setEroare] = useState("");

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    startTransition(async () => {
      const r = await salveazaAnuntJucatorAction({
        sport,
        oras,
        pozitii,
        nivel: (nivel || undefined) as "INCEPATOR" | "MEDIU" | "AVANSAT" | "COMPETITIV" | undefined,
        descriere: descriere || undefined,
        arataTelefon,
      });
      if (!r.ok) return setEroare(r.error);
      toast.success("Ești pe listă. Echipele te pot invita.");
      setDeschis(false);
    });
  }

  return (
    <>
      <Button
        onClick={() => setDeschis(true)}
        className="h-11 rounded-full bg-[#F3EFE6] px-5 text-[15px] font-semibold text-[#07160F] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] hover:bg-white"
      >
        <UserPlus className="h-4 w-4" />
        Caut echipă
      </Button>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">Vrei să intri într-o echipă?</DialogTitle>
            <DialogDescription>Spune ce joci și unde. Echipele din orașul tău te pot invita.</DialogDescription>
          </DialogHeader>

          <form onSubmit={trimite} className="space-y-5 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl">
            <div className="space-y-2">
              <Label>Sport</Label>
              <div className="flex flex-wrap gap-2">
                {sportOptions.filter((s) => s.value !== "OTHER").map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => { setSport(s.value); setPozitii([]); }}
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

            {POZITII[sport].length > 0 && (
              <div className="space-y-2">
                <Label>Pe ce poziție joci? (poți alege mai multe)</Label>
                <div className="flex flex-wrap gap-2">
                  {POZITII[sport].map((p) => {
                    const ales = pozitii.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPozitii(ales ? pozitii.filter((x) => x !== p) : [...pozitii, p])}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                          ales ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jucator-oras">Oraș</Label>
              <Input id="jucator-oras" value={oras} onChange={(e) => setOras(e.target.value)} placeholder="ex. Timișoara" />
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
              <Label htmlFor="jucator-descriere">Despre tine (opțional)</Label>
              <Textarea id="jucator-descriere" value={descriere} onChange={(e) => setDescriere(e.target.value)} placeholder="ex. Pot seara în cursul săptămânii, joc de 5 ani." maxLength={400} />
            </div>

            <label className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5 text-[14px]">
              <input type="checkbox" checked={arataTelefon} onChange={(e) => setArataTelefon(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E6B3A]" />
              <span>Arată numărul meu de telefon echipelor care mă invită</span>
            </label>

            {eroare && <p className="text-sm text-destructive">{eroare}</p>}
            <Button type="submit" disabled={seTrimite} className="h-12 w-full rounded-xl bg-[#0E6B3A] text-[15px] hover:bg-[#0B5A30]">
              {seTrimite ? "Se publică…" : "Pune-mă pe listă"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
