"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, CheckCircle2, ChevronRight, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";

import { Apple, Google } from "@/components/auth/butoane-sociale";

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
    { id: "card", titlu: "Online", detaliu: "Apple Pay, Google Pay sau card, rezervarea e garantată", Icoana: CreditCard },
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

type MetodaOnline = "applePay" | "googlePay" | "card";
type Pas = "alege" | "card" | "procesare" | "gata";

const METODE: { id: MetodaOnline; titlu: string; detaliu: string }[] = [
  { id: "applePay", titlu: "Apple Pay", detaliu: "Confirmi cu Face ID sau Touch ID" },
  { id: "googlePay", titlu: "Google Pay", detaliu: "Cu un card salvat în contul Google" },
  { id: "card", titlu: "Card bancar", detaliu: "Visa, Mastercard sau Maestro" },
];

function SiglaMetoda({ id }: { id: MetodaOnline }) {
  if (id === "applePay") {
    return (
      <span className="flex h-10 w-14 shrink-0 items-center justify-center gap-0.5 rounded-lg bg-black text-[13px] font-semibold text-white">
        <Apple className="-mt-0.5 h-3.5 w-3.5" />
        Pay
      </span>
    );
  }
  if (id === "googlePay") {
    return (
      <span className="flex h-10 w-14 shrink-0 items-center justify-center gap-1 rounded-lg border border-black/10 bg-white text-[13px] font-semibold text-[#3c4043]">
        <Google className="h-3.5 w-3.5" />
        Pay
      </span>
    );
  }
  return (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] text-white">
      <CreditCard className="h-5 w-5" />
    </span>
  );
}

const intrare = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

/**
 * Dialogul de plată: întâi alegi metoda (Apple Pay, Google Pay sau card),
 * abia apoi, pentru card, apar câmpurile. La final, „procesare” simulată.
 */
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
  const [pas, setPas] = useState<Pas>("alege");
  const [metoda, setMetoda] = useState<MetodaOnline | null>(null);
  const [numar, setNumar] = useState("");
  const [nume, setNume] = useState("");
  const [expira, setExpira] = useState("");
  const [cvc, setCvc] = useState("");
  const [intors, setIntors] = useState(false);
  const [eroare, setEroare] = useState("");

  const cifre = numar.replace(/\D/g, "");
  const ocupat = pas === "procesare" || pas === "gata";

  function goleste() {
    // Nimic nu rămâne după închidere.
    setNumar(""); setNume(""); setExpira(""); setCvc("");
    setPas("alege"); setMetoda(null); setEroare(""); setIntors(false);
  }

  useEffect(() => {
    if (!deschis) return;
    return goleste;
  }, [deschis]);

  function finalizeaza() {
    // Demonstrativ: nimic nu se debitează, nimic nu pleacă din pagină.
    setPas("procesare");
    setTimeout(() => {
      setPas("gata");
      setTimeout(() => {
        laPlata();
        laInchidere();
      }, 1100);
    }, 1500);
  }

  function plateste() {
    setEroare("");
    const [ll, aa] = expira.split("/").map(Number);
    const expirat = !ll || ll > 12 || !aa || new Date(2000 + aa, ll) <= new Date();
    if (!luhn(cifre)) return setEroare("Numărul cardului nu este valid.");
    if (nume.trim().length < 3) return setEroare("Scrie numele de pe card.");
    if (expirat) return setEroare("Data de expirare nu este validă.");
    if (!/^\d{3,4}$/.test(cvc)) return setEroare("CVC-ul are 3 sau 4 cifre.");
    finalizeaza();
  }

  const grupe = (cifre.padEnd(16, "•").match(/.{1,4}/g) ?? []).join(" ");
  const numeMetoda = METODE.find((m) => m.id === metoda)?.titlu ?? "";

  return (
    <Dialog open={deschis} onOpenChange={(o) => !o && !ocupat && laInchidere()}>
      <DialogContent
        showCloseButton={!ocupat}
        className="max-h-[92dvh] gap-5 overflow-y-auto rounded-3xl p-6 sm:max-w-md sm:p-7"
      >
        <DialogHeader className="gap-1.5">
          {pas === "card" && (
            <button
              type="button"
              onClick={() => { setPas("alege"); setEroare(""); }}
              className="-ml-1 mb-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Alte metode
            </button>
          )}
          <DialogTitle className="text-xl">{pas === "card" ? "Plată cu cardul" : "Finalizează rezervarea"}</DialogTitle>
          <DialogDescription>
            {pas === "card" ? "Introdu datele cardului." : "Plătești acum, iar terenul rămâne al tău."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-4">
          <span className="text-sm font-medium text-muted-foreground">Total de plată</span>
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {suma} <span className="text-sm font-semibold text-muted-foreground">RON</span>
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {pas === "alege" && (
            <motion.div key="alege" {...intrare} transition={{ duration: 0.2 }} className="space-y-4">
              <div role="radiogroup" aria-label="Metoda de plată" className="space-y-2.5">
                <p className="text-sm font-semibold">Alege metoda de plată</p>
                {METODE.map((m) => {
                  const ales = metoda === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={ales}
                      onClick={() => setMetoda(m.id)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border bg-card p-3.5 pr-4 text-left transition-all",
                        ales ? "border-primary bg-primary/[0.04] ring-4 ring-primary/10" : "hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <SiglaMetoda id={m.id} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">{m.titlu}</span>
                        <span className="block text-[13px] text-muted-foreground">{m.detaliu}</span>
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          ales ? "border-primary" : "border-muted-foreground/30"
                        )}
                      >
                        {ales && <motion.span layoutId="punct-plata" className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {metoda === "applePay" ? (
                <ButonApplePay onClick={finalizeaza} />
              ) : metoda === "googlePay" ? (
                <ButonGooglePay onClick={finalizeaza} />
              ) : (
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl text-[15px]"
                  disabled={!metoda}
                  onClick={() => setPas("card")}
                >
                  {metoda ? (
                    <>
                      Continuă cu cardul <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    "Alege o metodă de plată"
                  )}
                </Button>
              )}
            </motion.div>
          )}

          {pas === "card" && (
            <motion.form
              key="card"
              {...intrare}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => {
                e.preventDefault();
                plateste();
              }}
              className="space-y-4 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl"
              autoComplete="off"
            >
              {/* Cardul, care se întoarce când scrii CVC-ul. */}
              <div className="mx-auto w-full max-w-[320px] [perspective:1000px]">
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
                    <p className="font-mono text-[18px] tracking-[0.12em] tabular-nums">{grupe}</p>
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

              <div className="space-y-2">
                <Label>Numărul cardului</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={numar}
                  autoComplete="off"
                  autoFocus
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
            </motion.form>
          )}

          {ocupat && (
            <motion.div
              key="rezultat"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              {pas === "procesare" ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Se confirmă plata cu {numeMetoda}…</p>
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

        {!ocupat && (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Mod demonstrativ: nu se debitează nimic, iar datele nu sunt trimise nicăieri.
          </p>
        )}
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
      aria-label="Rezervă cu Apple Pay"
      className="buton-apple-pay flex h-12 w-full items-center justify-center rounded-xl bg-black text-[16px] font-medium text-white transition-opacity hover:opacity-90"
    >
      <span className="eticheta-apple-pay flex items-center gap-1.5">
        Rezervă cu
        <span className="flex items-center gap-0.5 font-semibold">
          <Apple className="-mt-0.5 h-[17px] w-[17px]" />
          Pay
        </span>
      </span>
    </button>
  );
}

/** Butonul Google Pay, negru, cum îl recomandă Google. */
function ButonGooglePay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Rezervă cu Google Pay"
      className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-black text-[16px] font-medium text-white transition-opacity hover:opacity-90"
    >
      Rezervă cu
      <span className="flex items-center gap-1 font-semibold">
        <Google className="h-[17px] w-[17px]" />
        Pay
      </span>
    </button>
  );
}
