"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { AvatarCont } from "@/components/cont/poza-profil";
import { noteazaJucatorAction } from "@/lib/actions/meciuri";
import type { MeciDeEvaluat } from "@/lib/note-jucatori";
import { sportMeta } from "@/lib/sports";
import { cn } from "@/lib/utils";

function cand(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long" });
}

/** „Cum a fost meciul?”: notele pentru organizator sau jucători, după meci. */
export function DeEvaluat({ meciuri }: { meciuri: MeciDeEvaluat[] }) {
  if (meciuri.length === 0) return null;
  return (
    <section className="mb-10 space-y-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cum a fost meciul?</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {meciuri.map((m) => (
          <article key={m.id} className="rounded-3xl border border-black/[0.06] bg-card p-5 shadow-sm dark:border-white/10">
            <p className="text-[15px] font-semibold capitalize">
              {sportMeta[m.sport].label} · {cand(m.inceput)}
            </p>
            <p className="text-[13px] text-muted-foreground">{m.locatie ? `${m.locatie}, ${m.oras}` : m.oras}</p>
            <div className="mt-4 space-y-4">
              {m.persoane.map((p) => (
                <NotaPersoana key={p.id} anuntId={m.id} persoana={p} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotaPersoana({ anuntId, persoana }: { anuntId: string; persoana: MeciDeEvaluat["persoane"][number] }) {
  const [nota, setNota] = useState(persoana.notaMea ?? 0);
  const [comentariu, setComentariu] = useState("");
  const [salvata, setSalvata] = useState(persoana.notaMea != null);
  const [seSalveaza, startTransition] = useTransition();

  function salveaza() {
    startTransition(async () => {
      const r = await noteazaJucatorAction(anuntId, { destinatarId: persoana.id, nota, comentariu: comentariu || undefined });
      if (!r.ok) return void toast.error(r.error);
      setSalvata(true);
      toast.success(`Nota pentru ${persoana.nume} a fost salvată.`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <AvatarCont nume={persoana.nume} poza={persoana.poza} className="h-9 w-9" textClassName="text-[11px]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px] font-medium">{persoana.nume}</p>
          <p className="text-[12px] text-muted-foreground">{persoana.rol}</p>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setNota(n); setSalvata(false); }}
              aria-label={`${n} ${n === 1 ? "stea" : "stele"}`}
              className="p-0.5"
            >
              <Star className={cn("h-6 w-6 transition-colors", n <= nota ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
            </button>
          ))}
        </div>
      </div>
      {nota > 0 && !salvata && (
        <div className="flex gap-2">
          <input
            value={comentariu}
            onChange={(e) => setComentariu(e.target.value)}
            maxLength={400}
            placeholder="Câteva cuvinte (opțional)"
            className="h-10 flex-1 rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={salveaza}
            disabled={seSalveaza}
            className="rounded-xl bg-[#0E6B3A] px-4 text-[14px] font-medium text-white hover:bg-[#0B5A30] disabled:opacity-50"
          >
            Salvează
          </button>
        </div>
      )}
      {salvata && <p className="text-[12px] font-medium text-primary">Nota ta a fost salvată.</p>}
    </div>
  );
}
