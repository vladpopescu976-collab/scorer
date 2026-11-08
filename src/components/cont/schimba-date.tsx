"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, KeyRound, Loader2, Lock, Mail, MailCheck, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CampIcon } from "@/components/auth/camp-icon";
import { CampParola } from "@/components/auth/camp-parola";
import { CerinteParola } from "@/components/auth/cerinte-parola";
import { cereSchimbareCont, confirmaSchimbareCont } from "@/lib/actions/cont";

type Tip = "email" | "telefon" | "parola";

const TEXTE: Record<Tip, { titlu: string; descriere: string }> = {
  email: { titlu: "Schimbă emailul", descriere: "Îți trimitem un cod pe adresa nouă, ca să confirmi că e a ta." },
  telefon: { titlu: "Schimbă telefonul", descriere: "Confirmi cu parola și cu un cod primit pe email." },
  parola: { titlu: "Schimbă parola", descriere: "Confirmi cu parola actuală și cu un cod primit pe email." },
};

/** Schimbarea emailului, telefonului sau parolei, în doi pași cu confirmare. */
export function SchimbaDate({ tip, nume, email }: { tip: Tip; nume: string; email: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [deschis, setDeschis] = useState(false);
  const [pas, setPas] = useState<"date" | "cod" | "gata">("date");
  const [valoare, setValoare] = useState("");
  const [confirmare, setConfirmare] = useState("");
  const [parolaCurenta, setParolaCurenta] = useState("");
  const [cod, setCod] = useState(["", "", "", "", "", ""]);
  const [token, setToken] = useState("");
  const [trimisLa, setTrimisLa] = useState("");
  const [eroare, setEroare] = useState("");
  const [seTrimite, startTransition] = useTransition();
  const casute = useRef<(HTMLInputElement | null)[]>([]);

  function reseteaza() {
    setPas("date"); setValoare(""); setConfirmare(""); setParolaCurenta("");
    setCod(["", "", "", "", "", ""]); setToken(""); setEroare("");
  }

  function cere() {
    setEroare("");
    if (tip === "parola" && valoare !== confirmare) {
      setEroare("Parolele nu coincid.");
      return;
    }
    startTransition(async () => {
      const r = await cereSchimbareCont({ tip, parolaCurenta, valoareNoua: valoare });
      if (!r.ok) return setEroare(r.error);
      setToken(r.data.token);
      setTrimisLa(r.data.trimisLa);
      setPas("cod");
      setTimeout(() => casute.current[0]?.focus(), 250);
    });
  }

  function confirma(cifre = cod) {
    const text = cifre.join("");
    if (text.length < 6) return;
    setEroare("");
    startTransition(async () => {
      const r = await confirmaSchimbareCont({ token, cod: text });
      if (!r.ok) {
        setEroare(r.error);
        setCod(["", "", "", "", "", ""]);
        casute.current[0]?.focus();
        return;
      }
      if (tip === "email") await update();
      setPas("gata");
      router.refresh();
      toast.success(tip === "parola" ? "Parola a fost schimbată." : tip === "email" ? "Emailul a fost schimbat." : "Telefonul a fost schimbat.");
    });
  }

  function scrieCifra(index: number, text: string) {
    const cifre = text.replace(/\D/g, "");
    const nou = [...cod];
    if (cifre.length > 1) {
      // Lipire: completăm toate căsuțele deodată.
      cifre.slice(0, 6).split("").forEach((c, i) => (nou[i] = c));
      setCod(nou);
      casute.current[Math.min(cifre.length, 6) - 1]?.focus();
      if (cifre.length >= 6) confirma(nou);
      return;
    }
    nou[index] = cifre;
    setCod(nou);
    if (cifre && index < 5) casute.current[index + 1]?.focus();
    if (nou.every(Boolean)) confirma(nou);
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => setDeschis(true)}>
        Schimbă
      </Button>

      <Dialog open={deschis} onOpenChange={(o) => { setDeschis(o); if (!o) reseteaza(); }}>
        <DialogContent className="rounded-3xl p-7 sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">{pas === "gata" ? "Gata" : TEXTE[tip].titlu}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {pas === "date" && TEXTE[tip].descriere}
              {pas === "cod" && (
                <>Am trimis un cod de 6 cifre la <span className="font-medium text-foreground">{trimisLa}</span>. E valabil 15 minute.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {pas === "date" && (
              <motion.form
                key="date"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onSubmit={(e) => { e.preventDefault(); cere(); }}
                className="space-y-5 [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:text-base"
              >
                <div className="space-y-2.5">
                  <Label className="text-[15px]">
                    {tip === "email" ? "Emailul nou" : tip === "telefon" ? "Numărul nou" : "Parola nouă"}
                  </Label>
                  {tip === "email" && (
                    <CampIcon pictograma={Mail} type="email" autoComplete="email" placeholder="nume@exemplu.ro" value={valoare} onChange={(e) => setValoare(e.target.value)} />
                  )}
                  {tip === "telefon" && (
                    <CampIcon pictograma={Phone} type="tel" autoComplete="tel" placeholder="0722 123 456" value={valoare} onChange={(e) => setValoare(e.target.value)} />
                  )}
                  {tip === "parola" && (
                    <>
                      <CampParola pictograma={Lock} autoComplete="new-password" placeholder="Minim 10 caractere" value={valoare} onChange={(e) => setValoare(e.target.value)} />
                      <CerinteParola parola={valoare} nume={nume} email={email} />
                    </>
                  )}
                </div>

                {tip === "parola" && (
                  <div className="space-y-2.5">
                    <Label className="text-[15px]">Confirmă parola nouă</Label>
                    <CampParola pictograma={Lock} autoComplete="new-password" placeholder="••••••••" value={confirmare} onChange={(e) => setConfirmare(e.target.value)} />
                  </div>
                )}

                <div className="space-y-2.5">
                  <Label className="text-[15px]">Parola actuală</Label>
                  <CampParola pictograma={KeyRound} autoComplete="current-password" placeholder="Parola cu care intri acum" value={parolaCurenta} onChange={(e) => setParolaCurenta(e.target.value)} />
                </div>

                {eroare && <p className="rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">{eroare}</p>}

                <Button type="submit" className="h-12 w-full rounded-xl text-[15px]" disabled={seTrimite || !valoare || !parolaCurenta}>
                  {seTrimite && <Loader2 className="h-4 w-4 animate-spin" />}
                  Trimite codul
                </Button>
              </motion.form>
            )}

            {pas === "cod" && (
              <motion.div key="cod" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MailCheck className="h-7 w-7" />
                </div>
                <div className="flex justify-center gap-2.5" onPaste={(e) => { e.preventDefault(); scrieCifra(0, e.clipboardData.getData("text")); }}>
                  {cod.map((cifra, i) => (
                    <input
                      key={i}
                      ref={(el) => { casute.current[i] = el; }}
                      value={cifra}
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={i === 0 ? 6 : 1}
                      aria-label={`Cifra ${i + 1}`}
                      onChange={(e) => scrieCifra(i, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Backspace" && !cod[i] && i > 0) casute.current[i - 1]?.focus(); }}
                      className="h-14 w-12 rounded-xl border-2 bg-background text-center text-2xl font-semibold tabular-nums outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  ))}
                </div>
                {eroare && <p className="text-center text-sm text-destructive">{eroare}</p>}
                <div className="space-y-2">
                  <Button className="h-12 w-full rounded-xl text-[15px]" disabled={seTrimite || cod.some((c) => !c)} onClick={() => confirma()}>
                    {seTrimite && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmă
                  </Button>
                  <Button variant="ghost" className="w-full" disabled={seTrimite} onClick={() => { setPas("date"); setEroare(""); }}>
                    Nu ai primit codul? Trimite din nou
                  </Button>
                </div>
              </motion.div>
            )}

            {pas === "gata" && (
              <motion.div key="gata" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                >
                  <CheckCircle2 className="h-8 w-8" />
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  {tip === "parola" ? "Parola a fost schimbată." : tip === "email" ? "Emailul contului a fost schimbat." : "Numărul de telefon a fost schimbat."}{" "}
                  Ți-am trimis și un email de confirmare.
                </p>
                <Button className="h-11 w-full rounded-xl" onClick={() => setDeschis(false)}>Închide</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
