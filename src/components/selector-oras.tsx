"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ORASE_ROMANIA, cheieOras } from "@/lib/orase";
import { cn } from "@/lib/utils";

/**
 * Alegerea orașului dintr-o listă, nu scris de mână: o greșeală de tastare
 * („Timisora”) făcea ca terenurile și jucătorii să nu mai fie găsiți.
 * Se poate scrie ca să se caute în listă, dar orașul trebuie ales.
 */
export function SelectorOras({
  value,
  onChange,
  placeholder = "Alege orașul",
  permiteToate = false,
  intunecat = false,
  fara_contur = false,
  className,
  id,
}: {
  value: string;
  onChange: (oras: string) => void;
  placeholder?: string;
  /** Prima opțiune e „Toate orașele” (golește alegerea). */
  permiteToate?: boolean;
  /** Pe fundal închis (bara de căutare de pe prima pagină e albă, deci nu). */
  intunecat?: boolean;
  /** Fără chenar, pentru bare de căutare care au deja unul. */
  fara_contur?: boolean;
  className?: string;
  id?: string;
}) {
  const [deschis, setDeschis] = useState(false);
  const [cautare, setCautare] = useState("");

  const potrivite = useMemo(() => {
    const cheie = cheieOras(cautare);
    const lista = cheie ? ORASE_ROMANIA.filter((o) => cheieOras(o).includes(cheie)) : ORASE_ROMANIA;
    // Cele care încep cu ce ai scris, primele.
    return [...lista].sort((a, b) => Number(!cheieOras(a).startsWith(cheie)) - Number(!cheieOras(b).startsWith(cheie))).slice(0, 80);
  }, [cautare]);

  function alege(oras: string) {
    onChange(oras);
    setDeschis(false);
    setCautare("");
  }

  return (
    <Popover open={deschis} onOpenChange={setDeschis}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 text-left text-[15px] outline-none",
              !fara_contur && "h-11 rounded-xl border bg-background px-3 focus-visible:border-primary",
              intunecat && "text-[#F3EFE6]",
              className
            )}
          />
        }
      >
        <MapPin className={cn("h-4 w-4 shrink-0", intunecat ? "text-[#F3EFE6]/60" : "text-muted-foreground")} />
        <span className={cn("flex-1 truncate", !value && (intunecat ? "text-[#F3EFE6]/50" : "text-muted-foreground"))}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && potrivite[0]) {
                e.preventDefault();
                alege(potrivite[0]);
              }
            }}
            placeholder="Caută orașul"
            className="h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1" role="listbox">
          {permiteToate && !cautare && (
            <li>
              <button type="button" onClick={() => alege("")} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[14px] hover:bg-muted">
                Toate orașele
                {!value && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          )}
          {potrivite.map((oras) => (
            <li key={oras}>
              <button
                type="button"
                role="option"
                aria-selected={oras === value}
                onClick={() => alege(oras)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[14px] hover:bg-muted"
              >
                {oras}
                {oras === value && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
          {potrivite.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-muted-foreground">Niciun oraș găsit</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
