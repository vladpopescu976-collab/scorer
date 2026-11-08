"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

function Google() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.7 1.8l3.5-3.5A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}

function Apple() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.7.9s-1.9-.8-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.7 2.4 3 2.4s1.7-.8 3.1-.8 1.9.8 3.1.8 2.1-1.2 2.9-2.3a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.5-3.9zM14 5.5A4.1 4.1 0 0 0 15 2.4a4.2 4.2 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 3A3.5 3.5 0 0 0 14 5.5z" />
    </svg>
  );
}

/**
 * „Continuă cu Google / Apple". Tipul de cont ales se ține într-un cookie,
 * fiindcă furnizorul ne aduce înapoi fără el.
 */
export function ButoaneSociale({
  role,
  google,
  apple,
}: {
  role: Role;
  google: boolean;
  apple: boolean;
}) {
  const [seIncarca, setSeIncarca] = useState<string | null>(null);
  if (!google && !apple) return null;

  function porneste(furnizor: "google" | "apple") {
    setSeIncarca(furnizor);
    document.cookie = `scorer_tip=${role === "BUSINESS" ? "business" : "personal"}; path=/; max-age=900; samesite=lax`;
    signIn(furnizor, { redirectTo: "/dupa-autentificare" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        sau continuă cu
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className={`grid gap-3 ${google && apple ? "grid-cols-2" : "grid-cols-1"}`}>
        {google && (
          <Button type="button" variant="outline" className="h-11 rounded-xl bg-card/60" disabled={!!seIncarca} onClick={() => porneste("google")}>
            {seIncarca === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Google />}
            Google
          </Button>
        )}
        {apple && (
          <Button type="button" variant="outline" className="h-11 rounded-xl bg-card/60" disabled={!!seIncarca} onClick={() => porneste("apple")}>
            {seIncarca === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Apple />}
            Apple
          </Button>
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Continuând, accepți termenii și politica de confidențialitate.
      </p>
    </div>
  );
}
