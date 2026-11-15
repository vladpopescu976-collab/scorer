"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EvenimentInstalare = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Butonul „Instalează aplicația”, mereu vizibil în bară. Unde browserul permite
 * (Edge, Chrome), deschide direct fereastra de instalare; altfel arată pașii
 * pentru browserul folosit. Pe un site deja instalat, butonul dispare.
 * Tot aici pornește service worker-ul, fără de care Windows nu oferă instalarea.
 */
export function InstaleazaAplicatia({ peHero, compact = false }: { peHero: boolean; compact?: boolean }) {
  const [eveniment, setEveniment] = useState<EvenimentInstalare | null>(null);
  const [instalata, setInstalata] = useState(false);
  const [ajutor, setAjutor] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const media = window.matchMedia("(display-mode: standalone)");
    const verifica = () => setInstalata(media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    verifica();
    media.addEventListener("change", verifica);
    const cand = (e: Event) => {
      e.preventDefault();
      setEveniment(e as EvenimentInstalare);
    };
    const instalat = () => {
      setEveniment(null);
      setInstalata(true);
    };
    window.addEventListener("beforeinstallprompt", cand);
    window.addEventListener("appinstalled", instalat);
    return () => {
      media.removeEventListener("change", verifica);
      window.removeEventListener("beforeinstallprompt", cand);
      window.removeEventListener("appinstalled", instalat);
    };
  }, []);

  if (instalata) return null;

  async function instaleaza() {
    if (eveniment) {
      await eveniment.prompt();
      await eveniment.userChoice;
      setEveniment(null);
    } else {
      setAjutor(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={instaleaza}
        title="Instalează Scorer ca aplicație"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors",
          peHero
            ? "border-white/25 text-white hover:bg-white/10"
            : "border-black/10 text-foreground hover:bg-muted dark:border-white/15",
          compact && "h-9 w-9 justify-center px-0"
        )}
      >
        <Download className="h-4 w-4" />
        {/* Pe ecrane medii doar iconița, ca bara să nu se înghesuie. */}
        {!compact && <span className="hidden xl:inline">Instalează aplicația</span>}
      </button>

      <Dialog open={ajutor} onOpenChange={setAjutor}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalează Scorer</DialogTitle>
            <DialogDescription>
              Scorer se deschide apoi ca un program separat, cu iconița lui în Start, în taskbar sau pe ecranul telefonului.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-4 text-[14px]">
            <li>
              <p className="font-semibold">Windows: Edge sau Chrome</p>
              <p className="text-muted-foreground">
                Apasă iconița de instalare din dreapta barei de adrese (un ecran cu săgeată), sau meniul ⋯ → Aplicații →
                „Instalează Scorer”.
              </p>
            </li>
            <li>
              <p className="font-semibold">Mac: Safari</p>
              <p className="text-muted-foreground">Meniul Fișier → „Adaugă în Dock”.</p>
            </li>
            <li>
              <p className="font-semibold">iPhone: Safari</p>
              <p className="text-muted-foreground">Butonul Partajează → „Adaugă pe ecranul principal”.</p>
            </li>
            <li>
              <p className="font-semibold">Android: Chrome</p>
              <p className="text-muted-foreground">Meniul ⋮ → „Instalează aplicația”.</p>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
