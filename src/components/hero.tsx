"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { HeroSearch } from "@/components/hero-search";

const USOR = [0.22, 1, 0.36, 1] as const;
const CRETA = "#F3EFE6";

// Granulație de film, desenată de browser (fără imagini de descărcat).
const GRANULATIE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const POPULARE = [
  { eticheta: "Fotbal 5+1", href: "/cauta-terenuri?sport=FOOTBALL&dimensiune=5%2B1" },
  { eticheta: "Tenis", href: "/cauta-terenuri?sport=TENNIS" },
  { eticheta: "Padel", href: "/cauta-terenuri?sport=PADEL" },
  { eticheta: "Baschet 3x3", href: "/cauta-terenuri?sport=BASKETBALL&dimensiune=3x3" },
];

// Liniile unui teren de fotbal văzut de sus, ca în siglă (cadru 680 × 440).
const LINII_TEREN = [
  "M18 10H662A8 8 0 0 1 670 18V422A8 8 0 0 1 662 430H18A8 8 0 0 1 10 422V18A8 8 0 0 1 18 10Z",
  "M340 10V430",
  "M340 158A62 62 0 1 1 340 282A62 62 0 1 1 340 158",
  "M10 110H110V330H10",
  "M10 165H48V275H10",
  "M670 110H570V330H670",
  "M670 165H632V275H670",
  "M110 180A50 50 0 0 1 110 260",
  "M570 180A50 50 0 0 0 570 260",
];

/** Un rând de titlu care urcă dintr-o mască, ca la tipar. */
function Rand({ children, intarziere }: { children: React.ReactNode; intarziere: number }) {
  return (
    <span className="block overflow-hidden pb-[0.1em]">
      <motion.span
        className="block"
        initial={{ y: "108%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.05, delay: intarziere, ease: USOR }}
      >
        {children}
      </motion.span>
    </span>
  );
}

const apare = (intarziere: number) => ({
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay: intarziere, ease: USOR },
});

/** Telefonul cu o captură reală din aplicație, cu umbre în straturi. */
function Telefon() {
  return (
    <div className="relative w-[280px] xl:w-[300px]">
      {/* Umbra de pe „podea”. */}
      <div className="absolute -bottom-12 left-1/2 h-20 w-[85%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-3xl" />

      {/* Butoanele laterale. */}
      <span className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-[#1c1c1c]" />
      <span className="absolute -left-[3px] top-[170px] h-14 w-[3px] rounded-l bg-[#1c1c1c]" />
      <span className="absolute -right-[3px] top-[150px] h-20 w-[3px] rounded-r bg-[#1c1c1c]" />

      <div className="relative rounded-[52px] bg-gradient-to-b from-[#3a3a3a] via-[#161616] to-[#0a0a0a] p-[10px] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_3px_rgba(0,0,0,0.35),0_24px_40px_-12px_rgba(0,0,0,0.65),0_70px_120px_-30px_rgba(0,0,0,0.8)]">
        <div className="pointer-events-none absolute inset-0 rounded-[52px] ring-1 ring-inset ring-white/15" />
        <div className="relative overflow-hidden rounded-[43px] bg-black">
          <Image
            src="/brand/aplicatie-rezervare.png"
            alt="Rezervarea unui teren în aplicația Scorer pentru iPhone"
            width={598}
            height={1300}
            priority
            sizes="300px"
            className="h-auto w-full"
          />
          {/* Reflexia sticlei. */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_38%)]" />
        </div>
      </div>
    </div>
  );
}

export function Hero({ numarTerenuri = 0 }: { numarTerenuri?: number }) {
  const sectiune = useRef<HTMLElement>(null);
  const faraMiscare = useReducedMotion();

  // Telefonul se înclină ușor după mouse; liniile și telefonul se mișcă
  // diferit la derulare, ca să se simtă adâncimea.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotireY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 110, damping: 18 });
  const rotireX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 110, damping: 18 });
  const { scrollYProgress } = useScroll({ target: sectiune, offset: ["start start", "end start"] });
  const telefonY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const liniiY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  return (
    // Urcă sub bara de sus, ca bara și partea de sus să fie un singur bloc.
    <section
      ref={sectiune}
      onMouseMove={(e) => {
        if (faraMiscare) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative -mt-16 overflow-hidden bg-[#07160F] text-[#F3EFE6]"
    >
      {/* Fundal: stadion seara. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0B2A1C_0%,#08190F_70%,#07160F_100%)]" />

        {/* Luminile de nocturnă. */}
        <motion.div
          animate={faraMiscare ? undefined : { opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 left-[6%] h-[760px] w-[240px] origin-top rotate-[24deg] bg-gradient-to-b from-[#F3EFE6]/[0.13] to-transparent blur-3xl"
        />
        <motion.div
          animate={faraMiscare ? undefined : { opacity: [0.9, 0.5, 0.9] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 right-[8%] h-[760px] w-[240px] origin-top -rotate-[24deg] bg-gradient-to-b from-[#F3EFE6]/[0.11] to-transparent blur-3xl"
        />

        {/* Liniile terenului, care se desenează la deschidere. */}
        <motion.div style={{ y: liniiY }} className="absolute -right-56 top-24 hidden w-[1000px] lg:block">
          <svg
            viewBox="0 0 680 440"
            fill="none"
            stroke={CRETA}
            strokeOpacity="0.09"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="w-full [transform:perspective(1400px)_rotateX(56deg)_rotateZ(-12deg)]"
          >
            {LINII_TEREN.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                initial={faraMiscare ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.2, delay: 0.4 + i * 0.12, ease: [0.65, 0, 0.35, 1] }}
              />
            ))}
          </svg>
        </motion.div>

        <div className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: GRANULATIE }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.35)_100%)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-32 sm:pt-40 lg:min-h-[780px] lg:grid-cols-[1fr_auto] lg:gap-20 lg:pb-28">
        <div>
          <motion.p {...apare(0)} className="flex items-center gap-2.5 text-[13.5px] font-medium text-[#F3EFE6]/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5BD885] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5BD885]" />
            </span>
            {numarTerenuri > 0 ? `${numarTerenuri} terenuri active în România` : "Terenuri în toată România"}
          </motion.p>

          <h1 className="mt-6 text-[3rem] leading-[0.98] sm:text-[4.4rem] lg:text-[5.2rem]">
            <Rand intarziere={0.1}>
              <span className="font-semibold tracking-[-0.045em]">Rezervă terenul.</span>
            </Rand>
            <Rand intarziere={0.22}>
              <span className="font-display text-[1.08em] italic tracking-[-0.01em] text-[#F3EFE6]/60">
                Restul e joc.
              </span>
            </Rand>
          </h1>

          <motion.p {...apare(0.45)} className="mt-7 max-w-md text-[17px] leading-relaxed text-[#F3EFE6]/65">
            Vezi orele libere ale terenurilor din orașul tău, alege intervalul și trimite cererea în câteva
            secunde.
          </motion.p>

          <motion.div {...apare(0.55)} className="mt-10">
            <HeroSearch />
          </motion.div>

          <motion.div
            {...apare(0.65)}
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#F3EFE6]/50"
          >
            <span>Populare:</span>
            {POPULARE.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="text-[#F3EFE6]/80 underline decoration-[#F3EFE6]/25 underline-offset-[5px] transition-colors hover:text-[#F3EFE6] hover:decoration-[#F3EFE6]/70"
              >
                {p.eticheta}
              </Link>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 14 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.3, delay: 0.35, ease: USOR }}
          style={{ y: telefonY }}
          className="relative hidden justify-self-center [perspective:1600px] lg:block"
        >
          <motion.div style={{ rotateX: rotireX, rotateY: rotireY }} className="[transform-style:preserve-3d]">
            <motion.div
              animate={faraMiscare ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <Telefon />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.5, ease: USOR }}
            className="absolute -right-14 top-24 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 xl:flex text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_12px_24px_-8px_rgba(0,0,0,0.35),0_40px_70px_-20px_rgba(0,0,0,0.55)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0E6B3A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold">Rezervare confirmată</p>
              <p className="text-[12px] text-neutral-500">Luni, 19:00 – 20:00</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative border-t border-[#F3EFE6]/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-[#F3EFE6]/55">
            <span className="font-display text-[19px] italic text-[#F3EFE6]">Ai un teren?</span>{" "}
            Primește rezervări online, cu calendar și confirmare automată.
          </p>
          <Link
            href="/autentificare?tip=business"
            className="group inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F3EFE6] px-4 py-2 text-[14px] font-semibold text-[#07160F] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-8px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-px"
          >
            Adaugă-l gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
