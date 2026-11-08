"use client";

import { forwardRef, useState } from "react";
import { ArrowBigUp, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Câmp de parolă cu „arată parola” și avertisment când Caps Lock e pornit.
 * Greșelile de tastare la parolă sunt cea mai frecventă cauză a unei
 * autentificări eșuate, mai ales pe telefon, unde nu vezi ce scrii.
 */
export const CampParola = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    pictograma?: React.ComponentType<{ className?: string }>;
  }
>(function CampParola(
  { onKeyDown, onKeyUp, onBlur, pictograma: Pictograma, ...props },
  ref,
) {
  const [vizibila, setVizibila] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function verificaCaps(eveniment: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(eveniment.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {Pictograma && (
          <Pictograma className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          {...props}
          ref={ref}
          type={vizibila ? "text" : "password"}
          className={Pictograma ? "pl-10 pr-11" : "pr-11"}
          onKeyDown={(e) => {
            verificaCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            verificaCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCapsLock(false);
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setVizibila((v) => !v)}
          aria-label={vizibila ? "Ascunde parola" : "Arată parola"}
          aria-pressed={vizibila}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {vizibila ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {capsLock && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-500"
        >
          <ArrowBigUp className="h-3.5 w-3.5" />
          Caps Lock este pornit
        </p>
      )}
    </div>
  );
});
