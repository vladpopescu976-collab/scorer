"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initialeDin(nume: string | null | undefined) {
  return (nume ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((bucata) => bucata[0]?.toUpperCase())
    .join("");
}

/** Poza de profil rotundă; fără poză, inițialele pe verdele site-ului. */
export function AvatarCont({
  nume,
  poza,
  className,
  textClassName,
}: {
  nume: string | null | undefined;
  poza: string | null | undefined;
  className?: string;
  textClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {poza && <AvatarImage src={poza} alt={nume ?? "Poza de profil"} className="object-cover" />}
      <AvatarFallback className={cn("bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] font-semibold text-white", textClassName)}>
        {initialeDin(nume) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** Taie poza la pătrat, din mijloc, și o micșorează înainte de încărcare. */
async function pregateste(fisier: File, latura = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(fisier);
  const minim = Math.min(bitmap.width, bitmap.height);
  const panza = document.createElement("canvas");
  panza.width = latura;
  panza.height = latura;
  const ctx = panza.getContext("2d");
  if (!ctx) throw new Error("Browserul nu poate prelucra poza.");
  ctx.drawImage(bitmap, (bitmap.width - minim) / 2, (bitmap.height - minim) / 2, minim, minim, 0, 0, latura, latura);
  return new Promise((rezolva, respinge) =>
    panza.toBlob((blob) => (blob ? rezolva(blob) : respinge(new Error("Poza nu a putut fi pregătită."))), "image/jpeg", 0.86)
  );
}

/** Antetul paginii de cont: poza mare, cu buton de schimbare. */
export function PozaProfil({ nume, poza }: { nume: string; poza: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const intrare = useRef<HTMLInputElement>(null);
  const [seIncarca, setSeIncarca] = useState(false);
  const [pozaActuala, setPozaActuala] = useState(poza);

  async function incarca(fisier: File) {
    setSeIncarca(true);
    try {
      const date = new FormData();
      date.append("files", await pregateste(fisier), "profil.jpg");
      const raspuns = await fetch("/api/cont/poza", { method: "POST", body: date });
      const corp = await raspuns.json().catch(() => ({}));
      if (!raspuns.ok) throw new Error(corp.error ?? "Poza nu a putut fi salvată.");
      setPozaActuala(corp.poza);
      await update();
      router.refresh();
      toast.success("Poza de profil a fost schimbată.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Poza nu a putut fi salvată.");
    } finally {
      setSeIncarca(false);
      if (intrare.current) intrare.current.value = "";
    }
  }

  async function scoate() {
    setSeIncarca(true);
    try {
      const raspuns = await fetch("/api/cont/poza", { method: "DELETE" });
      if (!raspuns.ok) throw new Error("Poza nu a putut fi scoasă.");
      setPozaActuala(null);
      await update();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Poza nu a putut fi scoasă.");
    } finally {
      setSeIncarca(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => intrare.current?.click()}
        disabled={seIncarca}
        aria-label={pozaActuala ? "Schimbă poza de profil" : "Adaugă o poză de profil"}
        className="group relative rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <AvatarCont
          nume={nume}
          poza={pozaActuala}
          className="size-28 ring-4 ring-background shadow-[0_2px_4px_rgba(0,0,0,0.06),0_20px_40px_-12px_rgba(14,107,58,0.35)] sm:size-32"
          textClassName="text-3xl sm:text-4xl"
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {!seIncarca && <Camera className="h-6 w-6" />}
        </span>
        {seIncarca && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
        )}
        <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#0E6B3A] text-white shadow-md ring-[3px] ring-background">
          <Camera className="h-4 w-4" />
        </span>
      </button>
      <input
        ref={intrare}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const fisier = e.target.files?.[0];
          if (fisier) incarca(fisier);
        }}
      />
      <div className="flex items-center gap-3 text-[13px]">
        <button
          type="button"
          onClick={() => intrare.current?.click()}
          disabled={seIncarca}
          className="font-medium text-primary hover:underline"
        >
          {pozaActuala ? "Schimbă poza" : "Adaugă o poză"}
        </button>
        {pozaActuala && (
          <>
            <span className="text-muted-foreground">·</span>
            <button type="button" onClick={scoate} disabled={seIncarca} className="text-muted-foreground hover:text-foreground">
              Scoate
            </button>
          </>
        )}
      </div>
    </div>
  );
}
