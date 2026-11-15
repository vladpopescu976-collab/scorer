"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  CalendarX,
  Clock3,
  Globe,
  Lock,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import { EditSlotDialog } from "@/components/dashboard/edit-slot-dialog";
import { BlockSlotDialog } from "@/components/dashboard/block-slot-dialog";
import { DayHeatPicker } from "@/components/dashboard/day-heat-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { unblockSeries, unblockSlot } from "@/lib/actions/blocked-slots";
import { clockInAppZone, toDateInput, toTimeInput } from "@/lib/datetime";
import { sportMeta } from "@/lib/sports";
import { clientulRezervarii } from "@/lib/client-rezervare";
import {
  felBlocare,
  FEL_INTERVAL,
  HASURA_IN_ASTEPTARE,
  STIL_INACTIV,
  type FelInterval,
} from "@/lib/interval-calendar";
import {
  filtreazaTerenuri,
  SelectorSportTeren,
  TOATE,
} from "@/components/dashboard/selector-sport-teren";
import type { BookingStatus, SportType } from "@prisma/client";
import { AntetPanou } from "@/components/antet-pagina";

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

/** Rezervările care nu mai ocupă terenul se desenează stinse, nu colorate. */
const STATUS_ACTIV: BookingStatus[] = ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"];

const ICOANA_FEL: Record<FelInterval, typeof Globe> = {
  site: Globe,
  telefon: Phone,
  privat: Lock,
};

type Booking = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  customer: { name: string } | null;
  guestName: string | null;
  guestPhone: string | null;
  field: { id: string; name: string };
};

function hourOf(d: Date) {
  // Ora terenului (România), oricare ar fi fusul browserului.
  const { hour, minute } = clockInAppZone(d);
  return hour + minute / 60;
}
function isoDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}
function fmtHour(h: number) {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

type BlockedSlot = {
  id: string;
  fieldId: string;
  startTime: Date;
  endTime: Date;
  reason: string | null;
  /// Completat când intervalul e o rezervare notată manual, nu o blocare.
  clientName: string | null;
  clientPhone: string | null;
  /// Prezent când blocarea face parte dintr-o serie săptămânală.
  serieId: string | null;
};

type ScheduleField = {
  id: string;
  name: string;
  sportType: string;
  openingHour: number;
  closingHour: number;
};

/** Ce s-a apăsat în grilă. Fereastra de detalii e aceeași pentru ambele. */
type Selectat =
  | { tip: "rezervare"; rezervare: Booking }
  | { tip: "blocare"; blocare: BlockedSlot; terenNume: string };

export function ScheduleClient({
  fields: toateTerenurile,
  bookings,
  blockedSlots,
}: {
  fields: ScheduleField[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
}) {
  // Filtrul are două trepte: întâi sportul, apoi terenul. Cu douăzeci de
  // terenuri, orarul desena douăzeci de coloane una lângă alta și trebuia
  // împins pe orizontală ca să ajungi la cel căutat.
  const [sportAles, setSportAles] = useState<string>(TOATE);
  const [terenAles, setTerenAles] = useState<string>(TOATE);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selected, setSelected] = useState<Selectat | null>(null);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ slot: BlockedSlot; terenNume: string } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Ziua arată toate terenurile una lângă alta; săptămâna arată un singur
  // teren, cu cele șapte zile pe coloane, ca un calendar de perete.
  const [mod, setMod] = useState<"zi" | "saptamana">("zi");
  const [terenSapt, setTerenSapt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Ce ocupă efectiv terenul: rezervările active plus orele blocate manual.
  const heatIntervals = useMemo(
    () => [
      ...bookings
        .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
        .map((b) => ({ fieldId: b.field.id, startTime: b.startTime, endTime: b.endTime })),
      ...blockedSlots.map((s) => ({
        fieldId: s.fieldId,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    ],
    [bookings, blockedSlots]
  );

  // Ce se desenează efectiv în orar, după alegerea din selectoare.
  const fields = useMemo(
    () => filtreazaTerenuri(toateTerenurile, sportAles, terenAles),
    [toateTerenurile, sportAles, terenAles]
  );

  const numeTeren = useMemo(
    () => new Map(toateTerenurile.map((f) => [f.id, f.name])),
    [toateTerenurile]
  );

  const terenSaptamana = fields.find((f) => f.id === terenSapt) ?? fields[0];

  const zileSaptamana = useMemo(() => {
    const d = selectedDate;
    const dinLuni = (d.getDay() + 6) % 7;
    const luni = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dinLuni);
    return Array.from({ length: 7 }, (_, i) => new Date(luni.getFullYear(), luni.getMonth(), luni.getDate() + i));
  }, [selectedDate]);

  /** Coloanele grilei: terenele (pe zi) sau zilele (pe săptămână). */
  const coloane = useMemo(() => {
    const azi = isoDate(new Date());
    if (mod === "zi") {
      return fields.map((f) => ({
        cheie: f.id,
        titlu: f.name,
        sub: sportMeta[f.sportType as SportType]?.label ?? f.sportType,
        fieldId: f.id,
        zi: selectedDate,
        azi: false,
      }));
    }
    if (!terenSaptamana) return [];
    const ziFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "short" });
    return zileSaptamana.map((z) => ({
      cheie: z.toDateString(),
      titlu: ziFmt.format(z).replace(".", ""),
      sub: String(z.getDate()),
      fieldId: terenSaptamana.id,
      zi: z,
      azi: isoDate(z) === azi,
    }));
  }, [mod, fields, selectedDate, terenSaptamana, zileSaptamana]);

  const ocupateInVedere = useMemo(() => {
    const zile = new Set(coloane.map((c) => isoDate(c.zi)));
    const terenuri = new Set(coloane.map((c) => c.fieldId));
    return (
      bookings.some((b) => terenuri.has(b.field.id) && zile.has(isoDate(b.startTime))) ||
      blockedSlots.some((s) => terenuri.has(s.fieldId) && zile.has(isoDate(s.startTime)))
    );
  }, [coloane, bookings, blockedSlots]);

  function muta(directie: 1 | -1) {
    const pas = mod === "zi" ? 1 : 7;
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + directie * pas));
  }

  function removeBlock(id: string) {
    startTransition(async () => {
      const result = await unblockSlot(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSelected(null);
      toast.success("Intervalul a fost deblocat.");
    });
  }

  /// O serie de un an s-ar șterge altfel apăsând de cincizeci de ori.
  function removeSeries(serieId: string, fieldId: string) {
    startTransition(async () => {
      const result = await unblockSeries(serieId, fieldId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSelected(null);
      toast.success(
        `${result.data} ${result.data === 1 ? "interval deblocat" : "intervale deblocate"} din serie.`
      );
    });
  }

  const isToday = isoDate(selectedDate) === isoDate(new Date());
  const weekdayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long" });
  const longDateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  // Etichetă scurtă pentru butonul din mijloc, ca să nu lățească bara.
  const shortDateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });
  const primaZi = zileSaptamana[0];
  const ultimaZi = zileSaptamana[6];
  const lunaFmt = new Intl.DateTimeFormat("ro-RO", { month: "long" });
  const intervalSaptamana =
    primaZi.getMonth() === ultimaZi.getMonth()
      ? `${primaZi.getDate()} – ${ultimaZi.getDate()} ${lunaFmt.format(ultimaZi)}`
      : `${primaZi.getDate()} ${lunaFmt.format(primaZi)} – ${ultimaZi.getDate()} ${lunaFmt.format(ultimaZi)}`;
  const intervalScurt = `${primaZi.getDate()}–${shortDateFmt.format(ultimaZi)}`;
  const saptamanaCurenta = zileSaptamana.some((z) => isoDate(z) === isoDate(new Date()));

  return (
    <div className="space-y-4">
      <AntetPanou
        eticheta="Calendar & orar"
        titlu={mod === "zi" ? weekdayFmt.format(selectedDate) : "Săptămâna"}
        accent={mod === "zi" ? longDateFmt.format(selectedDate) : intervalSaptamana}
        detaliu={mod === "saptamana" && terenSaptamana ? terenSaptamana.name : undefined}
        actiuni={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => muta(-1)}
                className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{mod === "zi" ? "Ziua anterioară" : "Săpt. anterioară"}</span>
              </button>
              {/* Data vizitată se vede mereu, iar apăsarea deschide un calendar
                  în care zilele sunt colorate după cât de ocupate sunt. */}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      title="Alege ziua"
                      className={
                        "flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] font-medium tabular-nums " +
                        ((mod === "zi" ? isToday : saptamanaCurenta) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted")
                      }
                    />
                  }
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {mod === "zi" ? (
                    <>
                      {isToday && <span>Azi ·</span>}
                      {shortDateFmt.format(selectedDate)}
                    </>
                  ) : (
                    <>
                      {saptamanaCurenta && <span>Acum ·</span>}
                      {intervalScurt}
                    </>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0">
                  <DayHeatPicker
                    fields={fields}
                    intervals={heatIntervals}
                    selectedDate={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setPickerOpen(false);
                    }}
                  />
                  {!isToday && (
                    <div className="border-t p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(new Date());
                          setPickerOpen(false);
                        }}
                        className="w-full rounded-md px-2 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10"
                      >
                        Înapoi la azi
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => muta(1)}
                className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="hidden sm:inline">{mod === "zi" ? "Ziua următoare" : "Săpt. următoare"}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => setBlockOpen(true)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F3EFE6] px-3.5 py-2 text-[12.5px] font-semibold text-[#0B2A1C] hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Blochează ore
              </button>
            )}
          </div>
        }
      >
        {/* Pe verde, ca în aplicație: comutatorul Zi / Săptămână și, pe
            săptămână, terenul afișat. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid w-full grid-cols-2 rounded-full bg-white/[0.08] p-1 ring-1 ring-inset ring-white/10 sm:w-64">
            {(["zi", "saptamana"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMod(m)}
                className={`rounded-full py-2 text-[13px] font-semibold transition-colors ${
                  mod === m ? "bg-[#F3EFE6] text-[#0B2A1C] shadow-sm" : "text-[#F3EFE6]/70 hover:text-[#F3EFE6]"
                }`}
              >
                {m === "zi" ? "Zi" : "Săptămână"}
              </button>
            ))}
          </div>
          {mod === "saptamana" && fields.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0">
              {fields.map((f) => {
                const ales = f.id === terenSaptamana?.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTerenSapt(f.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ring-1 ring-inset transition-colors ${
                      ales
                        ? "bg-[#F3EFE6] text-[#0B2A1C] ring-transparent"
                        : "bg-white/[0.06] text-[#F3EFE6]/75 ring-white/15 hover:text-[#F3EFE6]"
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </AntetPanou>

      <SelectorSportTeren
        terenuri={toateTerenurile}
        sportAles={sportAles}
        terenAles={terenAles}
        laSport={setSportAles}
        laTeren={setTerenAles}
      />

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="text-[13.5px] font-medium">Niciun teren adăugat</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Adaugă un teren din secțiunea „Setări terenuri” pentru a vedea orarul.
          </p>
        </div>
      ) : (
        <>
          <Legenda />

          <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
            <div style={{ minWidth: mod === "zi" ? 120 + coloane.length * 180 : 56 + 7 * 76 }}>
              <div
                className="sticky top-0 z-20 grid border-b bg-background"
                style={{ gridTemplateColumns: `56px repeat(${coloane.length}, 1fr)` }}
              >
                <div />
                {coloane.map((c) =>
                  mod === "zi" ? (
                    <div key={c.cheie} className="border-l px-3 py-3">
                      <p className="truncate text-[12px] font-semibold">{c.titlu}</p>
                      <p className="truncate text-[10.5px] text-muted-foreground">{c.sub}</p>
                    </div>
                  ) : (
                    // Apăsarea pe o zi o deschide pe toată pagina, cu toate terenurile.
                    <button
                      key={c.cheie}
                      type="button"
                      title="Vezi ziua"
                      onClick={() => {
                        setSelectedDate(c.zi);
                        setMod("zi");
                      }}
                      className={`flex flex-col items-center border-l py-2.5 transition-colors hover:bg-muted/60 ${c.azi ? "bg-primary/[0.06]" : ""}`}
                    >
                      <span
                        className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${c.azi ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {c.titlu}
                      </span>
                      <span
                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums ${
                          c.azi ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        {c.sub}
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${coloane.length}, 1fr)` }}>
                <div className="relative">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end border-b pr-2">
                      <span className="-mt-2 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {coloane.map((col) => (
                  <div key={col.cheie} className={`relative border-l ${col.azi ? "bg-primary/[0.03]" : ""}`}>
                    {HOURS.map((h) => (
                      <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b" />
                    ))}

                    {blockedSlots
                      .filter((s) => s.fieldId === col.fieldId && isoDate(s.startTime) === isoDate(col.zi))
                      .map((s) => {
                        const fel = felBlocare(s.clientName);
                        const stil = FEL_INTERVAL[fel];
                        const Icoana = ICOANA_FEL[fel];
                        const start = hourOf(s.startTime);
                        const end = hourOf(s.endTime);
                        const top = (start - START_HOUR) * HOUR_HEIGHT;
                        const height = Math.max((end - start) * HOUR_HEIGHT - 4, 30);
                        return (
                          <motion.button
                            key={s.id}
                            type="button"
                            layout
                            onClick={() =>
                              setSelected({
                                tip: "blocare",
                                blocare: s,
                                terenNume: numeTeren.get(s.fieldId) ?? "",
                              })
                            }
                            whileHover={{ scale: 1.015 }}
                            style={{ top, height }}
                            title="Deschide intervalul ca să-i schimbi ora"
                            className={`absolute inset-x-1 z-10 flex flex-col items-start overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm ${stil.fundal} ${stil.margine} ${stil.text}`}
                          >
                            <span className="flex w-full items-center gap-1 truncate text-[11.5px] font-semibold leading-tight">
                              <Icoana className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.clientName || s.reason || "Eveniment privat"}</span>
                              {s.serieId && <CalendarX className="ml-auto h-3 w-3 shrink-0 opacity-60" />}
                            </span>
                            {s.clientPhone && (
                              <span className="truncate text-[10px] leading-tight opacity-75">{s.clientPhone}</span>
                            )}
                            <span className="mt-auto truncate font-mono text-[10.5px] leading-tight opacity-80 tabular-nums">
                              {fmtHour(start)}–{fmtHour(end)}
                            </span>
                          </motion.button>
                        );
                      })}

                    <AnimatePresence>
                      {bookings
                        .filter((b) => b.field.id === col.fieldId && isoDate(b.startTime) === isoDate(col.zi))
                        .map((b) => {
                          const activa = STATUS_ACTIV.includes(b.status);
                          const stil = activa ? FEL_INTERVAL.site : STIL_INACTIV;
                          const start = hourOf(b.startTime);
                          const end = hourOf(b.endTime);
                          const top = (start - START_HOUR) * HOUR_HEIGHT;
                          const height = Math.max((end - start) * HOUR_HEIGHT - 4, 30);
                          return (
                            <motion.button
                              key={b.id}
                              type="button"
                              layout
                              onClick={() => setSelected({ tip: "rezervare", rezervare: b })}
                              initial={{ scale: 0.94 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.015 }}
                              style={{
                                top,
                                height,
                                // Verdele rămâne al sursei; haşura spune că
                                // proprietarul încă nu a răspuns.
                                backgroundImage:
                                  b.status === "PENDING" ? HASURA_IN_ASTEPTARE : undefined,
                              }}
                              title="Deschide rezervarea ca să-i schimbi ora"
                              className={`absolute inset-x-1 z-10 flex flex-col items-start overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm ${stil.fundal} ${stil.margine} ${stil.text}`}
                            >
                              <span className="flex w-full items-center gap-1 truncate text-[11.5px] font-semibold leading-tight">
                                {b.status === "PENDING" ? (
                                  <Clock3 className="h-3 w-3 shrink-0" />
                                ) : (
                                  <Globe className="h-3 w-3 shrink-0" />
                                )}
                                <span className="truncate">{clientulRezervarii(b).nume}</span>
                              </span>
                              <span className="mt-auto truncate font-mono text-[10.5px] leading-tight opacity-80 tabular-nums">
                                {fmtHour(start)}–{fmtHour(end)}
                              </span>
                            </motion.button>
                          );
                        })}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!ocupateInVedere && fields.length > 0 && (
        <p className="text-center text-[12.5px] text-muted-foreground">
          {mod === "zi" ? "Nicio oră ocupată în această zi." : "Nicio oră ocupată în această săptămână."}
        </p>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-xl"
            >
              {selected.tip === "rezervare" ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <EtichetaFel fel="site" />
                    <StatusBadge status={selected.rezervare.status} />
                  </div>
                  <h4 className="mt-2 font-heading text-[17px] font-semibold">{selected.rezervare.field.name}</h4>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {fmtHour(hourOf(selected.rezervare.startTime))} – {fmtHour(hourOf(selected.rezervare.endTime))}
                  </p>
                  <p className="mt-3 text-[13.5px]">
                    Client: <span className="font-medium">{clientulRezervarii(selected.rezervare).nume}</span>
                  </p>
                  <p className="mt-1 font-mono text-[13px] tabular-nums">
                    {selected.rezervare.totalPrice.toFixed(0)} RON
                  </p>
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium hover:bg-muted"
                    >
                      Închide
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduling(selected.rezervare);
                        setSelected(null);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Schimbă ora
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <EtichetaFel fel={felBlocare(selected.blocare.clientName)} />
                  <h4 className="mt-2 font-heading text-[17px] font-semibold">
                    {selected.blocare.clientName || selected.blocare.reason || "Eveniment privat"}
                  </h4>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {selected.terenNume} ·{" "}
                    {fmtHour(hourOf(selected.blocare.startTime))} – {fmtHour(hourOf(selected.blocare.endTime))}
                  </p>
                  {selected.blocare.clientPhone && (
                    <p className="mt-3 font-mono text-[13px] tabular-nums">{selected.blocare.clientPhone}</p>
                  )}
                  {selected.blocare.clientName && selected.blocare.reason && (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">{selected.blocare.reason}</p>
                  )}
                  {selected.blocare.serieId && (
                    <p className="mt-3 text-[12.5px] text-muted-foreground">Se repetă săptămânal.</p>
                  )}

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium hover:bg-muted"
                    >
                      Închide
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlot({ slot: selected.blocare, terenNume: selected.terenNume });
                        setSelected(null);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Schimbă ora
                    </button>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeBlock(selected.blocare.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Șterge ora
                    </button>
                    {selected.blocare.serieId && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => removeSeries(selected.blocare.serieId!, selected.blocare.fieldId)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        <CalendarX className="h-3.5 w-3.5" />
                        Șterge seria
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {editingSlot && (
        <EditSlotDialog
          // Cheia remontează dialogul la fiecare interval, ca să pornească de
          // la orele lui, nu de la ale celui deschis înainte.
          key={editingSlot.slot.id}
          slotId={editingSlot.slot.id}
          titlu={editingSlot.slot.clientName || editingSlot.slot.reason || "Eveniment privat"}
          fieldName={editingSlot.terenNume}
          defaultDate={toDateInput(editingSlot.slot.startTime)}
          defaultStart={toTimeInput(editingSlot.slot.startTime)}
          defaultEnd={toTimeInput(editingSlot.slot.endTime)}
          open={!!editingSlot}
          onOpenChange={(open) => !open && setEditingSlot(null)}
        />
      )}

      {fields.length > 0 && (
        <BlockSlotDialog
          fields={fields}
          defaultDate={selectedDate}
          open={blockOpen}
          onOpenChange={setBlockOpen}
        />
      )}
    </div>
  );
}

/** Ce înseamnă fiecare culoare din grilă. Fără ea, cele trei verzi-albastre-mov
 *  ar fi doar decor. */
function Legenda() {
  const feluri: FelInterval[] = ["site", "telefon", "privat"];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11.5px] text-muted-foreground">
      {feluri.map((fel) => {
        const Icoana = ICOANA_FEL[fel];
        return (
          <span key={fel} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${FEL_INTERVAL[fel].bulina}`} />
            <Icoana className="h-3 w-3" />
            {FEL_INTERVAL[fel].eticheta}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full border border-muted-foreground/40"
          style={{ backgroundImage: HASURA_IN_ASTEPTARE }}
        />
        <Clock3 className="h-3 w-3" />
        În așteptarea răspunsului tău
      </span>
    </div>
  );
}

function EtichetaFel({ fel }: { fel: FelInterval }) {
  const Icoana = ICOANA_FEL[fel];
  const stil = FEL_INTERVAL[fel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${stil.fundal} ${stil.text}`}
    >
      <Icoana className="h-3 w-3" />
      {stil.eticheta}
    </span>
  );
}
