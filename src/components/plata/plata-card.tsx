"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Plata cu cardul — DOAR DEMONSTRATIV. Nu există încă un procesator de plăți:
 * datele cardului rămân în memoria paginii, nu se trimit nicăieri și nimic nu
 * se debitează. Când se conectează un procesator (Stripe, Netopia), formularul
 * acesta se înlocuiește cu câmpurile lui securizate.
 */

export type MetodaPlata = "card" | "teren";

export function AlegeMetodaPlata({ metoda, alege }: { metoda: MetodaPlata; alege: (m: MetodaPlata) => void }) {
  const optiuni: { id: MetodaPlata; titlu: string; detaliu: string; Icoana: typeof CreditCard }[] = [
    { id: "card", titlu: "Online", detaliu: "Apple Pay sau card, rezervarea e garantată", Icoana: CreditCard },
    { id: "teren", titlu: "La teren", detaliu: "Numerar sau card, la sosire", Icoana: Banknote },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium">Plata</p>
      <div className="grid grid-cols-2 gap-2">
        {optiuni.map(({ id, titlu, detaliu, Icoana }) => (
          <button
            key={id}
            type="button"
            onClick={() => alege(id)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
              metoda === id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40"
            )}
          >
            <Icoana className={cn("h-5 w-5", metoda === id ? "text-primary" : "text-muted-foreground")} />
            <span className="text-[13px] font-semibold">{titlu}</span>
            <span className="text-[11.5px] leading-snug text-muted-foreground">{detaliu}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function luhn(cifre: string): boolean {
  let suma = 0;
  for (let i = 0; i < cifre.length; i++) {
    let c = Number(cifre[cifre.length - 1 - i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    suma += c;
  }
  return cifre.length >= 13 && suma % 10 === 0;
}

function marca(cifre: string): string {
  if (/^4/.test(cifre)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(cifre)) return "mastercard";
  if (/^3[47]/.test(cifre)) return "amex";
  return "";
}

/** Dialogul de plată: card animat care se întoarce la CVC, apoi „procesare”. */
export function DialogPlataCard({
  deschis,
  laInchidere,
  suma,
  laPlata,
}: {
  deschis: boolean;
  laInchidere: () => void;
  suma: number;
  /** Chemat după plata simulată; aici se trimite rezervarea. */
  laPlata: () => void;
}) {
  const [numar, setNumar] = useState("");
  const [nume, setNume] = useState("");
  const [expira, setExpira] = useState("");
  const [cvc, setCvc] = useState("");
  const [intors, setIntors] = useState(false);
  const [stare, setStare] = useState<"formular" | "procesare" | "gata">("formular");
  const [eroare, setEroare] = useState("");

  const cifre = numar.replace(/\D/g, "");

  function goleste() {
    // Nimic nu rămâne după închidere.
    setNumar(""); setNume(""); setExpira(""); setCvc("");
    setStare("formular"); setEroare(""); setIntors(false);
  }

  useEffect(() => {
    if (!deschis) return;
    return goleste;
  }, [deschis]);

  function plateste() {
    setEroare("");
    const [ll, aa] = expira.split("/").map(Number);
    const expirat = !ll || ll > 12 || !aa || new Date(2000 + aa, ll) <= new Date();
    if (!luhn(cifre)) return setEroare("Numărul cardului nu este valid.");
    if (nume.trim().length < 3) return setEroare("Scrie numele de pe card.");
    if (expirat) return setEroare("Data de expirare nu este validă.");
    if (!/^\d{3,4}$/.test(cvc)) return setEroare("CVC-ul are 3 sau 4 cifre.");
    setStare("procesare");
    setTimeout(() => {
      setStare("gata");
      setTimeout(() => {
        laPlata();
        laInchidere();
      }, 1100);
    }, 1600);
  }

  const grupe = (cifre.padEnd(16, "•").match(/.{1,4}/g) ?? []).join(" ");

  return (
    <Dialog open={deschis} onOpenChange={(o) => !o && stare === "formular" && laInchidere()}>
      <DialogContent className="rounded-3xl p-7 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Plată cu cardul</DialogTitle>
          <DialogDescription>
            Total de plată: <span className="font-semibold text-foreground">{suma} RON</span>
          </DialogDescription>
        </DialogHeader>

        {/* Cardul, care se întoarce când scrii CVC-ul. */}
        <div className="mx-auto w-full max-w-[340px] [perspective:1000px]">
          <motion.div
            animate={{ rotateY: intors ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[1.586] w-full [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0E6B3A] via-[#17854A] to-[#2FA560] p-5 text-white shadow-xl shadow-primary/30 [backface-visibility:hidden]">
              <div className="flex items-start justify-between">
                <div className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 to-amber-400" />
                <span className="text-sm font-bold uppercase tracking-wider opacity-90">{marca(cifre)}</span>
              </div>
              <p className="font-mono text-[19px] tracking-[0.12em] tabular-nums">{grupe}</p>
              <div className="flex items-end justify-between text-[11px] uppercase">
                <div>
                  <p className="opacity-70">Titular</p>
                  <p className="text-sm font-medium normal-case">{nume || "Nume Prenume"}</p>
                </div>
                <div className="text-right">
                  <p className="opacity-70">Expiră</p>
                  <p className="font-mono text-sm">{expira || "LL/AA"}</p>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="mt-6 h-10 bg-black/70" />
              <div className="mx-5 mt-5 flex items-center justify-end rounded bg-white/90 px-3 py-1.5 font-mono text-sm text-black">
                {cvc.padEnd(3, "•")}
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {stare === "formular" && (
            <motion.div key="applepay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <ButonApplePay
                onClick={() => {
                  // Demonstrativ, ca și cardul: nimic nu se debitează.
                  setStare("procesare");
                  setTimeout(() => {
                    setStare("gata");
                    setTimeout(() => {
                      laPlata();
                      laInchidere();
                    }, 1100);
                  }, 1400);
                }}
              />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                sau cu cardul
                <span className="h-px flex-1 bg-border" />
              </div>
            </motion.div>
          )}
          {stare === "formular" ? (
            <motion.form
              key="formular"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                plateste();
              }}
              className="space-y-4 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl"
              autoComplete="off"
            >
              <div className="space-y-2">
                <Label>Numărul cardului</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={numar}
                  autoComplete="off"
                  onChange={(e) => setNumar((e.target.value.replace(/\D/g, "").slice(0, 16).match(/.{1,4}/g) ?? []).join(" "))}
                  onFocus={() => setIntors(false)}
                />
              </div>
              <div className="space-y-2">
                <Label>Numele de pe card</Label>
                <Input placeholder="Ion Popescu" value={nume} autoComplete="off" onChange={(e) => setNume(e.target.value)} onFocus={() => setIntors(false)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Expiră</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="LL/AA"
                    value={expira}
                    autoComplete="off"
                    onChange={(e) => {
                      const c = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setExpira(c.length > 2 ? `${c.slice(0, 2)}/${c.slice(2)}` : c);
                    }}
                    onFocus={() => setIntors(false)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="123"
                    value={cvc}
                    autoComplete="off"
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onFocus={() => setIntors(true)}
                    onBlur={() => setIntors(false)}
                  />
                </div>
              </div>
              {eroare && <p className="text-sm text-destructive">{eroare}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl text-[15px]">
                <Lock className="h-4 w-4" /> Plătește {suma} RON
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                Mod demonstrativ: cardul nu este debitat, iar datele nu sunt trimise nicăieri.
              </p>
            </motion.form>
          ) : (
            <motion.div
              key="rezultat"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              {stare === "procesare" ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Se procesează plata…</p>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                    <CheckCircle2 className="h-12 w-12 text-primary" />
                  </motion.div>
                  <p className="font-medium">Plata a fost acceptată</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Butonul Apple Pay. În Safari se desenează butonul oficial al sistemului
 * (`-apple-pay-button`); în celelalte browsere, unul negru care arată la fel.
 */
function ButonApplePay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Plătește cu Apple Pay"
      className="buton-apple-pay flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-black text-[17px] font-medium text-white transition-opacity hover:opacity-90"
    >
      <span className="eticheta-apple-pay flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current -mt-0.5" aria-hidden>
          <path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.7.9s-1.9-.8-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.7 2.4 3 2.4s1.7-.8 3.1-.8 1.9.8 3.1.8 2.1-1.2 2.9-2.3a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.5-3.9zM14 5.5A4.1 4.1 0 0 0 15 2.4a4.2 4.2 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 3A3.5 3.5 0 0 0 14 5.5z" />
        </svg>
        Pay
      </span>
    </button>
  );
}
