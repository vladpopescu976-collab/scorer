"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";

type EvenimentInstalare = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Pornește service worker-ul (fără el, Windows nu oferă instalarea) și arată
 * „Instalează aplicația” când browserul (Edge, Chrome) permite. Pe un site
 * deja instalat, butonul nu apare.
 */
export function InstaleazaAplicatia({ peHero }: { peHero: boolean }) {
  const [eveniment, setEveniment] = useState<EvenimentInstalare | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const cand = (e: Event) => {
      e.preventDefault();
      setEveniment(e as EvenimentInstalare);
    };
    const instalat = () => setEveniment(null);
    window.addEventListener("beforeinstallprompt", cand);
    window.addEventListener("appinstalled", instalat);
    return () => {
      window.removeEventListener("beforeinstallprompt", cand);
      window.removeEventListener("appinstalled", instalat);
    };
  }, []);

  if (!eveniment) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await eveniment.prompt();
        await eveniment.userChoice;
        setEveniment(null);
      }}
      title="Instalează Scorer ca aplicație pe calculator"
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors md:inline-flex",
        peHero ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Download className="h-4 w-4" />
      Instalează aplicația
    </button>
  );
}
