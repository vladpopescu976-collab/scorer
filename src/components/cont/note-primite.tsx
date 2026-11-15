import { Star } from "lucide-react";

import { AvatarCont } from "@/components/cont/poza-profil";
import type { NotePrimite } from "@/lib/note-jucatori";
import { sportMeta } from "@/lib/sports";

/** Notele primite după meciuri, pe pagina de cont. */
export function NotePrimiteCont({ note }: { note: NotePrimite }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notele tale după meciuri</h2>
      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.08)] dark:border-white/10">
        {note.numar === 0 ? (
          <p className="p-6 text-[14px] text-muted-foreground">
            Încă nicio notă. După un meci din „Găsește meci”, organizatorul și jucătorii se pot nota unii pe alții.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4 border-b p-6">
              <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">{note.medie?.toFixed(1)}</span>
              <div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-5 w-5 ${n <= Math.round(note.medie ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {note.numar} {note.numar === 1 ? "notă" : "note"} de la alți jucători
                </p>
              </div>
            </div>
            <ul className="divide-y">
              {note.note.map((n) => (
                <li key={n.id} className="flex gap-3 px-6 py-4">
                  <AvatarCont nume={n.autor.nume} poza={n.autor.poza} className="h-9 w-9" textClassName="text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[14px] font-medium">{n.autor.nume}</p>
                      <span className="text-[13px] text-amber-500">{"★".repeat(n.nota)}{"☆".repeat(5 - n.nota)}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {sportMeta[n.sport].label} · {new Date(n.data).toLocaleDateString("ro-RO", { day: "numeric", month: "long" })}
                    </p>
                    {n.comentariu && <p className="mt-1 text-[14px]">„{n.comentariu}”</p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
