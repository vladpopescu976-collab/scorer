"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Acceptă sau refuză ora nouă propusă de proprietar, fără cont. */
export function RaspunsMutare({ token, propunere }: { token: string; propunere: string }) {
  const router = useRouter();
  const [seTrimite, setSeTrimite] = useState<"accepta" | "refuza" | null>(null);

  async function raspunde(actiune: "accepta" | "refuza") {
    setSeTrimite(actiune);
    try {
      const raspuns = await fetch("/api/rezervari-vizitator/mutare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, actiune }),
      });
      const date = await raspuns.json().catch(() => ({}));
      if (!raspuns.ok) {
        toast.error(date.error ?? "Nu am putut trimite răspunsul.");
        return;
      }
      toast.success(actiune === "accepta" ? "Ai acceptat ora nouă." : "Ai refuzat propunerea.");
      router.refresh();
    } finally {
      setSeTrimite(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
      <div>
        <p className="text-sm font-semibold">Proprietarul îți propune altă oră</p>
        <p className="mt-1 text-sm text-muted-foreground">{propunere}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={!!seTrimite} onClick={() => raspunde("refuza")}>
          {seTrimite === "refuza" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Refuz
        </Button>
        <Button disabled={!!seTrimite} onClick={() => raspunde("accepta")}>
          {seTrimite === "accepta" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Accept
        </Button>
      </div>
    </div>
  );
}
