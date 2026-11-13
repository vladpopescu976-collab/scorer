"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock3, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { clientulRezervarii } from "@/lib/client-rezervare";
import {
  filtreazaTerenuri,
  SelectorSportTeren,
  TOATE,
} from "@/components/dashboard/selector-sport-teren";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import { approveBooking, rejectBooking } from "@/lib/actions/business";
import { bookingStatusLabel } from "@/lib/status";
import { toDateInput, toTimeInput } from "@/lib/datetime";
import type { BookingStatus } from "@prisma/client";

type Row = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  // Lipsește când rezervarea vine de la cineva fără cont.
  customer: { name: string; phone: string | null } | null;
  guestName: string | null;
  guestPhone: string | null;
  extras: { id: string; name: string; units: number; pricing: string; total: number }[];
  field: { id: string; name: string };
  createdAt: Date;
};

type Ordine = "noi" | "deConfirmat" | "urmatoare";

const ORDINI: { id: Ordine; eticheta: string }[] = [
  { id: "noi", eticheta: "Cele mai noi" },
  { id: "deConfirmat", eticheta: "De confirmat întâi" },
  { id: "urmatoare", eticheta: "După data jocului" },
];

const FILTERS: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "REJECTED", "RESCHEDULE_PROPOSED"];

function fmtDate(d: Date) {
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

export function BookingsTable({ bookings, fields }: { bookings: Row[]; fields: { id: string; name: string; sportType: string }[] }) {
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
  const [sportAles, setSportAles] = useState<string>(TOATE);
  const [terenAles, setTerenAles] = useState<string>(TOATE);
  const [query, setQuery] = useState("");
  // Implicit: ultima rezervare primită e sus.
  const [ordine, setOrdine] = useState<Ordine>("noi");
  // Momentul deschiderii paginii: separă meciurile care urmează de cele trecute.
  const [acum] = useState(() => Date.now());
  const [rescheduling, setRescheduling] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const terenuriVizibile = useMemo(
    () => new Set(filtreazaTerenuri(fields, sportAles, terenAles).map((t) => t.id)),
    [fields, sportAles, terenAles]
  );

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (filter !== "ALL" && b.status !== filter) return false;
        if (!terenuriVizibile.has(b.field.id)) return false;
        if (query && !clientulRezervarii(b).nume.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (ordine === "deConfirmat") {
          const pa = a.status === "PENDING" ? 0 : 1;
          const pb = b.status === "PENDING" ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        if (ordine === "urmatoare") {
          // Meciurile care urmează, cel mai apropiat primul; cele trecute la final.
          const ta = a.startTime.getTime(), tb = b.startTime.getTime();
          const viitorA = ta >= acum, viitorB = tb >= acum;
          if (viitorA !== viitorB) return viitorA ? -1 : 1;
          return viitorA ? ta - tb : tb - ta;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [bookings, filter, terenuriVizibile, query, ordine, acum]);

  function handleApprove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await approveBooking(id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Rezervare aprobată.");
    });
  }

  function handleReject(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await rejectBooking(id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Rezervare respinsă.");
    });
  }

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[20px] font-semibold">Gestionare rezervări</h1>
          <p className="text-[13px] text-muted-foreground">
            {bookings.length} în total · {pendingCount} necesită răspuns
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută după client…" className="pl-9" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
              (filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground")
            }
          >
            {f === "ALL" ? "Toate" : bookingStatusLabel[f]}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          Ordine
          <select
            value={ordine}
            onChange={(e) => setOrdine(e.target.value as Ordine)}
            className="rounded-full border bg-background px-3 py-1.5 text-[12.5px] font-medium text-foreground"
          >
            {ORDINI.map((o) => (
              <option key={o.id} value={o.id}>{o.eticheta}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Aceeași alegere ca în orar: întâi sportul, apoi terenul. O listă cu
          toate terenurile cerea citite douăzeci de nume ca să fie găsit unul. */}
      <SelectorSportTeren
        terenuri={fields}
        sportAles={sportAles}
        terenAles={terenAles}
        laSport={setSportAles}
        laTeren={setTerenAles}
      />

      <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b text-[11.5px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Teren</th>
              <th className="px-5 py-3 font-medium">Dată &amp; oră</th>
              <th className="px-5 py-3 font-medium">Preț</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map((b) => (
                <motion.tr
                  key={b.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b text-[13.5px] last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{clientulRezervarii(b).nume}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {clientulRezervarii(b).telefon ?? "—"}
                      {!clientulRezervarii(b).areCont && (
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          fără cont
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">{b.field.name}</td>
                  <td className="px-5 py-3.5">
                    <p>{fmtDate(b.startTime)}</p>
                    <p className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-mono tabular-nums">{b.totalPrice.toFixed(0)} RON</p>
                    {b.extras.map((optiune) => (
                      <p key={optiune.id} className="text-[11px] text-muted-foreground">
                        + {optiune.name}
                        {optiune.pricing === "PER_HOUR" && ` ×${optiune.units}`}
                      </p>
                    ))}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {b.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={isPending && pendingId === b.id}
                            onClick={() => handleApprove(b.id)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 hover:brightness-95 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            <Check className="h-3.5 w-3.5" /> Aprobă
                          </button>
                          <button
                            type="button"
                            disabled={isPending && pendingId === b.id}
                            onClick={() => handleReject(b.id)}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-medium text-rose-700 hover:brightness-95 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" /> Respinge
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setRescheduling(b)}
                        title="Mută rezervarea la altă dată/oră"
                        className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted/70"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">Mută ora</span>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13.5px] font-medium">Nicio rezervare găsită</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Încearcă alt filtru sau altă căutare.</p>
          </div>
        )}
      </div>

      {rescheduling && (
        <RescheduleDialog
          bookingId={rescheduling.id}
          clientName={clientulRezervarii(rescheduling).nume}
          fieldName={rescheduling.field.name}
          defaultDate={toDateInput(rescheduling.startTime)}
          defaultStart={toTimeInput(rescheduling.startTime)}
          defaultEnd={toTimeInput(rescheduling.endTime)}
          open={!!rescheduling}
          onOpenChange={(open) => !open && setRescheduling(null)}
        />
      )}
    </div>
  );
}
