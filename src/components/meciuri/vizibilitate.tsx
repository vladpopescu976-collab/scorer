"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { seteazaVizibilitateAction } from "@/lib/actions/meciuri";

/** Comutatorul „Apar în căutare”. Implicit oprit. */
export function Vizibilitate({ vizibil: initial }: { vizibil: boolean }) {
  const [vizibil, setVizibil] = useState(initial);
  const [seSalveaza, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-full border border-[#F3EFE6]/20 py-2 pl-4 pr-2 text-[14px] text-[#F3EFE6]/85">
      Apar și eu în căutare
      <button
        type="button"
        role="switch"
        aria-checked={vizibil}
        disabled={seSalveaza}
        onClick={() => {
          const nou = !vizibil;
          setVizibil(nou);
          startTransition(async () => {
            const rezultat = await seteazaVizibilitateAction(nou);
            if (!rezultat.ok) {
              setVizibil(!nou);
              toast.error(rezultat.error);
            } else toast.success(nou ? "Acum apari în căutare." : "Nu mai apari în căutare.");
          });
        }}
        className={`relative h-7 w-12 rounded-full transition-colors ${vizibil ? "bg-[#2FA560]" : "bg-[#F3EFE6]/20"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${vizibil ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}
