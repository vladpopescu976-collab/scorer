"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { sportOptions } from "@/lib/sports";

/** Orașul și sportul: se scriu în adresă, ca lista să poată fi trimisă cuiva. */
export function FiltreMeciuri({ cale, oras, sport, cuNume = false, nume = "" }: {
  cale: string;
  oras: string;
  sport: string;
  cuNume?: boolean;
  nume?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [orasLocal, setOrasLocal] = useState(oras);
  const [numeLocal, setNumeLocal] = useState(nume);

  function aplica(schimbari: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const valori = { oras: orasLocal, sport, nume: numeLocal, ...schimbari };
    Object.entries(valori).forEach(([cheie, valoare]) => valoare && params.set(cheie, valoare));
    startTransition(() => router.push(`${cale}${params.size ? `?${params}` : ""}`));
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          aplica({});
        }}
        className="flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 text-neutral-900 shadow-[0_1px_1px_rgba(0,0,0,0.08),0_10px_20px_-6px_rgba(0,0,0,0.28),0_40px_80px_-20px_rgba(0,0,0,0.6)] sm:flex-row sm:items-center sm:rounded-full"
      >
        <label className="flex flex-1 items-center gap-2 px-3 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            value={orasLocal}
            onChange={(e) => setOrasLocal(e.target.value)}
            placeholder="Orașul tău, ex. Timișoara"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
        </label>
        {cuNume && (
          <>
            <span className="hidden h-8 w-px bg-neutral-200 sm:block" />
            <label className="flex flex-1 items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                value={numeLocal}
                onChange={(e) => setNumeLocal(e.target.value)}
                placeholder="Nume (opțional)"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
              />
            </label>
          </>
        )}
        <button
          type="submit"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#0E6B3A] px-6 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#0B5A30]"
        >
          <Search className="h-4 w-4" />
          Caută
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Toate" }, ...sportOptions.filter((s) => s.value !== "OTHER")].map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => aplica({ sport: s.value || undefined })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              sport === s.value
                ? "border-[#F3EFE6] bg-[#F3EFE6] text-[#07160F]"
                : "border-[#F3EFE6]/20 text-[#F3EFE6]/75 hover:border-[#F3EFE6]/50 hover:text-[#F3EFE6]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
