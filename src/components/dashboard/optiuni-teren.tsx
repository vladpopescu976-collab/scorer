"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adaugaOptiune, stergeOptiune } from "@/lib/actions/optiuni";

export type OptiuneSalvata = {
  id: string;
  name: string;
  price: number;
  pricing: "PER_HOUR" | "PER_BOOKING";
  autoLaIntuneric: boolean;
};

const MODURI: Record<string, string> = {
  PER_HOUR: "pe oră",
  PER_BOOKING: "o dată pe rezervare",
};

/**
 * Ce se poate adăuga peste prețul orei. Cele marcate „la întuneric” se pun
 * singure, doar pentru orele de după apus — de aceea nu pot fi taxate o
 * singură dată pe rezervare.
 */
export function OptiuniTeren({
  fieldId,
  optiuni,
}: {
  fieldId: string;
  optiuni: OptiuneSalvata[];
}) {
  const [nume, setNume] = useState("");
  const [pret, setPret] = useState("");
  const [mod, setMod] = useState<"PER_HOUR" | "PER_BOOKING">("PER_HOUR");
  const [laIntuneric, setLaIntuneric] = useState(false);
  const [isPending, startTransition] = useTransition();

  function adauga() {
    const valoare = Number(pret);
    if (nume.trim().length < 2) {
      toast.error("Scrie o denumire.");
      return;
    }
    if (!Number.isFinite(valoare) || valoare <= 0) {
      toast.error("Prețul trebuie să fie mai mare decât 0.");
      return;
    }

    startTransition(async () => {
      const rezultat = await adaugaOptiune({
        fieldId,
        name: nume.trim(),
        price: valoare,
        pricing: laIntuneric ? "PER_HOUR" : mod,
        autoLaIntuneric: laIntuneric,
      });
      if (!rezultat.ok) {
        toast.error(rezultat.error);
        return;
      }
      toast.success("Opțiunea a fost adăugată.");
      setNume("");
      setPret("");
      setLaIntuneric(false);
    });
  }

  function sterge(id: string) {
    startTransition(async () => {
      const rezultat = await stergeOptiune(id);
      if (!rezultat.ok) {
        toast.error(rezultat.error);
        return;
      }
      toast.success("Opțiunea a fost ștearsă. Rezervările existente rămân neschimbate.");
    });
  }

  return (
    <div className="space-y-3">
      {optiuni.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {optiuni.map((optiune) => (
            <li key={optiune.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{optiune.name}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {optiune.price} RON {MODURI[optiune.pricing]}
                  {optiune.autoLaIntuneric && " · se adaugă singură după apus"}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                aria-label={`Șterge ${optiune.name}`}
                onClick={() => sterge(optiune.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2.5 rounded-xl border border-dashed p-3">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-[11.5px] text-muted-foreground">Denumire</Label>
            <Input
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              placeholder="Nocturnă"
              className="mt-1"
            />
          </div>
          <div className="w-full sm:w-28">
            <Label className="text-[11.5px] text-muted-foreground">Preț (RON)</Label>
            <Input
              value={pret}
              onChange={(e) => setPret(e.target.value)}
              placeholder="11"
              inputMode="decimal"
              className="mt-1"
            />
          </div>
        </div>

        {!laIntuneric && (
          <div>
            <Label className="text-[11.5px] text-muted-foreground">Se taxează</Label>
            <Select value={mod} onValueChange={(v) => v && setMod(v as typeof mod)}>
              <SelectTrigger className="mt-1 w-full">
                {/* Fără funcția asta, Base UI afișează valoarea brută. */}
                <SelectValue>{(v) => MODURI[String(v)] ?? "pe oră"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PER_HOUR">pe oră</SelectItem>
                <SelectItem value="PER_BOOKING">o dată pe rezervare</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px]">
          <input
            type="checkbox"
            checked={laIntuneric}
            onChange={(e) => setLaIntuneric(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-muted-foreground">
            Se adaugă singură pe orele fără lumină naturală. Apusul se calculează din dată și din
            orașul terenului, deci la 18:00 în decembrie intră, iar în iunie nu.
          </span>
        </label>

        <Button size="sm" onClick={adauga} disabled={isPending}>
          <Plus className="h-4 w-4" />
          Adaugă opțiunea
        </Button>
      </div>
    </div>
  );
}
