"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AnuleazaRezervarea({ token }: { token: string }) {
  const router = useRouter();
  const [seAnuleaza, setSeAnuleaza] = useState(false);

  async function anuleaza() {
    setSeAnuleaza(true);
    try {
      const raspuns = await fetch("/api/rezervari-vizitator/anulare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const date = await raspuns.json();
      if (!raspuns.ok) {
        toast.error(date.error ?? "Nu am putut anula rezervarea.");
        return;
      }
      toast.success("Rezervarea a fost anulată.");
      router.refresh();
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    } finally {
      setSeAnuleaza(false);
    }
  }

  return (
    <Button variant="destructive" className="w-full" onClick={anuleaza} disabled={seAnuleaza}>
      {seAnuleaza && <Loader2 className="h-4 w-4 animate-spin" />}
      Anulează rezervarea
    </Button>
  );
}
