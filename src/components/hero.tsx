"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { HeroSearch } from "@/components/hero-search";

const intrare = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const AVANTAJE = ["Rezervi și fără cont", "Plătești online sau la teren", "Vezi orele libere pe loc"];

/** Liniile unui teren de fotbal văzut de sus, la fel ca în siglă. */
function LiniiTeren({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 440" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="10" y="10" width="660" height="420" rx="8" />
      <line x1="340" y1="10" x2="340" y2="430" />
      <circle cx="340" cy="220" r="62" />
      <circle cx="340" cy="220" r="3" fill="currentColor" />
      <rect x="10" y="110" width="100" height="220" />
      <rect x="10" y="165" width="38" height="110" />
      <rect x="570" y="110" width="100" height="220" />
      <rect x="632" y="165" width="38" height="110" />
      <path d="M110 180a50 50 0 0 1 0 80" />
      <path d="M570 180a50 50 0 0 0 0 80" />
    </svg>
  );
}

type StareOra = "ocupat" | "ales" | "liber";

const ORE: { ora: string; stare: StareOra }[] = [
  { ora: "17:00", stare: "ocupat" },
  { ora: "18:00", stare: "ocupat" },
  { ora: "19:00", stare: "ales" },
  { ora: "20:00", stare: "ales" },
  { ora: "21:00", stare: "liber" },
  { ora: "22:00", stare: "liber" },
];

/** Ilustrație: cum arată o rezervare în Scorer. Nu sunt date reale. */
function PrevizualizareRezervare() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[360px] select-none">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">Teren sintetic · 5+1</p>
            <p className="mt-0.5 text-[13px] text-white/50">Azi · alege orele</p>
          </div>
          <span className="rounded-full bg-[#7FE0A6]/15 px-2.5 py-1 text-[12px] font-medium text-[#7FE0A6]">
            4 ore libere
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {ORE.map(({ ora, stare }) => (
            <span
              key={ora}
              className={
                "rounded-xl py-2.5 text-center text-[13px] tabular-nums " +
                (stare === "ales"
                  ? "bg-white font-semibold text-[#0B4A2D]"
                  : stare === "ocupat"
                    ? "bg-white/[0.03] text-white/25 line-through"
                    : "border border-white/15 text-white/80")
              }
            >
              {ora}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <div>
            <p className="text-[12px] text-white/45">19:00 – 21:00</p>
            <p className="text-xl font-semibold tabular-nums">340 RON</p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0B4A2D]">Rezervă</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.1, ease: [0.22, 1, 0.36, 1] as const }}
        className="absolute -bottom-[54px] -left-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-foreground shadow-2xl shadow-black/30"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#17854A]" />
        <div className="leading-tight">
          <p className="text-[13px] font-semibold">Rezervare confirmată</p>
          <p className="text-[12px] text-muted-foreground">Azi, 19:00 – 21:00</p>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    // Urcă sub bara de sus, ca bara și partea de sus să fie un singur bloc.
    <section className="relative -mt-16 overflow-hidden bg-[#06231A] text-white">
      {/* Fundal: lumină de nocturnă, gazon tuns în dungi, liniile terenului. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_78%_0%,#14804B_0%,#0B4A2D_42%,#06231A_100%)]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.022)_0_96px,transparent_96px_192px)]" />
        <LiniiTeren className="absolute -right-48 top-20 hidden w-[980px] text-white/[0.07] [transform:perspective(1400px)_rotateX(52deg)_rotateZ(-10deg)] lg:block" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-32 sm:pt-40 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:pb-28">
        <div>
          <motion.p
            {...intrare(0)}
            className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-[#7FE0A6]"
          >
            Fotbal · Baschet · Tenis · Padel
          </motion.p>

          <motion.h1
            {...intrare(0.08)}
            className="mt-5 text-balance text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[4.3rem]"
          >
            Rezervă un teren sportiv
            <span className="block text-white/45">în câteva secunde.</span>
          </motion.h1>

          <motion.p {...intrare(0.16)} className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/70">
            Vezi orele libere ale terenurilor din orașul tău, alege intervalul și trimite cererea. Fără telefoane,
            fără așteptat.
          </motion.p>

          <motion.div {...intrare(0.24)} className="mt-9">
            <HeroSearch />
          </motion.div>

          <motion.ul
            {...intrare(0.32)}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/65"
          >
            {AVANTAJE.map((avantaj) => (
              <li key={avantaj} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#7FE0A6]" />
                {avantaj}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
          className="hidden lg:block"
        >
          <PrevizualizareRezervare />
        </motion.div>
      </div>

      <div className="relative border-t border-white/10 bg-black/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-5 text-[14px] sm:flex-row sm:items-center sm:justify-between">
          <span className="text-white/55">Ai un teren? Primește rezervări online, cu calendar și confirmare automată.</span>
          <Link
            href="/autentificare?tip=business"
            className="group inline-flex w-fit items-center gap-1.5 font-medium text-white"
          >
            Adaugă-l gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
