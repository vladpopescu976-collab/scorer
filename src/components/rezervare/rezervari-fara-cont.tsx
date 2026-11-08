"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MailCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampIcon } from "@/components/auth/camp-icon";

/**
 * „Rezervările mele” fără cont: cine a rezervat ca vizitator își primește
 * linkurile pe email, fără să fie obligat să își facă un cont.
 */
export function RezervariFaraCont() {
  const [email, setEmail] = useState("");
  const [seTrimite, setSeTrimite] = useState(false);
  const [trimis, setTrimis] = useState(false);
  const [eroare, setEroare] = useState("");

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    setSeTrimite(true);
    try {
      const raspuns = await fetch("/api/rezervari-vizitator/linkuri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const date = await raspuns.json().catch(() => ({}));
      if (!raspuns.ok) {
        setEroare(date.error ?? "Nu am putut trimite linkurile.");
        return;
      }
      setTrimis(true);
    } finally {
      setSeTrimite(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Rezervările mele</h1>
        <p className="text-muted-foreground">
          Ai rezervat fără cont? Nu ai nevoie de unul ca să îți vezi rezervarea.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border bg-card/80 p-6 shadow-sm">
        {trimis ? (
          <div className="space-y-2 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <p className="font-medium">Verifică-ți emailul</p>
            <p className="text-sm text-muted-foreground">
              Dacă ai rezervări făcute fără cont pe {email}, linkurile lor sunt pe drum. Nu le găsești?
              Verifică și Spam.
            </p>
          </div>
        ) : (
          <form onSubmit={trimite} className="space-y-4">
            <div className="space-y-2">
              <p className="text-[15px] font-medium">Primește linkul pe email</p>
              <p className="text-sm text-muted-foreground">
                Scrie adresa folosită la rezervare și îți trimitem din nou linkul fiecărei rezervări.
              </p>
            </div>
            <CampIcon
              pictograma={Mail}
              type="email"
              required
              autoComplete="email"
              placeholder="nume@exemplu.ro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
            />
            {eroare && <p className="text-sm text-destructive">{eroare}</p>}
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={seTrimite}>
              {seTrimite && <Loader2 className="h-4 w-4 animate-spin" />}
              Trimite linkurile
            </Button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        sau
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-xl"
        nativeButton={false}
        render={<Link href="/autentificare?tip=personal" />}
      >
        <UserRound className="h-4 w-4" />
        Intră în cont
      </Button>
    </div>
  );
}
