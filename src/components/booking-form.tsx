"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { calculeazaPretul, type OptiuneTeren } from "@/lib/pret-rezervare";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBookingRequest, getBookedSlots } from "@/lib/actions/bookings";
import { AlegeMetodaPlata, DialogPlataCard, type MetodaPlata } from "@/components/plata/plata-card";
import { instantInAppZone, localDateTimeToIso, ziCaText } from "@/lib/datetime";
import {
  busyHours,
  describeOccupied,
  hourLabels,
  hourOf,
  rangeIsBusy,
  type Interval,
} from "@/lib/availability";

export function BookingForm({
  fieldId,
  pricePerHour,
  openingHour,
  closingHour,
  isAuthenticated,
  autoConfirmDays,
  city,
  optiuni,
}: {
  fieldId: string;
  pricePerHour: number;
  openingHour: number;
  closingHour: number;
  isAuthenticated: boolean;
  /** 0 înseamnă că proprietarul confirmă fiecare cerere. */
  autoConfirmDays: number;
  city: string;
  optiuni: OptiuneTeren[];
}) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [notes, setNotes] = useState("");
  // Cerute doar când rezervarea se face fără cont.
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [emailVizitator, setEmailVizitator] = useState("");
  const [optiuniAlese, setOptiuniAlese] = useState<string[]>([]);
  const [metodaPlata, setMetodaPlata] = useState<MetodaPlata>("card");
  const [plataDeschisa, setPlataDeschisa] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [occupied, setOccupied] = useState<Interval[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Intervalele deja rezervate se cer la alegerea zilei, ca orele ocupate să
  // apară gri înainte ca utilizatorul să încerce să le selecteze.
  async function loadOccupied(day: Date) {
    setLoadingSlots(true);
    setOccupied([]);
    try {
      // Ziua terenului, în ora României.
      const dayStart = instantInAppZone(ziCaText(day), 0)!;
      const dayEnd = instantInAppZone(ziCaText(day), 24)!;
      const result = await getBookedSlots({
        fieldId,
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
      });
      if (result.ok) {
        setOccupied(result.data.map((s) => ({ start: new Date(s.start), end: new Date(s.end) })));
      }
    } finally {
      setLoadingSlots(false);
    }
  }

  // Orele care au început deja nu se mai pot rezerva: serverul refuză orice
  // rezervare care pornește în trecut, deci și ora în curs. Înainte le arătam
  // libere, iar la 21:30 intervalul 21–22 părea liber și apoi era respins.
  const inceput = useMemo(() => {
    const set = new Set<number>();
    if (!date) return set;
    const acum = new Date();
    for (let ora = openingHour; ora < closingHour; ora++) {
      const momentul = instantInAppZone(ziCaText(date), ora);
      if (momentul && momentul <= acum) set.add(ora);
    }
    return set;
  }, [date, openingHour, closingHour]);

  const busy = useMemo(() => {
    if (!date) return new Set<number>();
    const set = busyHours(date, occupied, openingHour, closingHour);
    inceput.forEach((ora) => set.add(ora));
    return set;
  }, [date, occupied, openingHour, closingHour, inceput]);

  const startOptions = useMemo(() => hourLabels(openingHour, closingHour), [openingHour, closingHour]);
  const endOptions = useMemo(() => {
    if (!start) return [];
    return hourLabels(hourOf(start) + 1, closingHour + 1);
  }, [start, closingHour]);

  // O oră de sfârșit e valabilă doar dacă tot intervalul până la ea e liber.
  function endIsBusy(endLabel: string) {
    return start ? rangeIsBusy(hourOf(start), hourOf(endLabel), busy) : false;
  }

  function pickStart(value: string) {
    if (busy.has(hourOf(value))) {
      setError(
        inceput.has(hourOf(value))
          ? `Ora ${value} a început deja. Alege o oră de mai târziu.`
          : `Intervalul ${value} este deja rezervat pe acest teren. Alege altă oră.`
      );
      return;
    }
    setError("");
    setStart(value);
    setEnd("");
  }

  function pickEnd(value: string) {
    if (endIsBusy(value)) {
      setError(`Intervalul ${start}–${value} trece peste o rezervare existentă. Alege altă oră.`);
      return;
    }
    setError("");
    setEnd(value);
  }

  const hours = start && end ? hourOf(end) - hourOf(start) : 0;

  // Aceeași funcție rulează și pe server la creare: aici doar ca omul să vadă
  // totalul cât alege, nu după ce trimite.
  const pret = useMemo(() => {
    if (!date || !start || !end || hours <= 0) return null;
    const zi = format(date, "yyyy-MM-dd");
    const inceput = localDateTimeToIso(zi, start);
    const sfarsit = localDateTimeToIso(zi, end);
    if (!inceput || !sfarsit) return null;
    return calculeazaPretul({
      pretPeOra: pricePerHour,
      inceput: new Date(inceput),
      sfarsit: new Date(sfarsit),
      oras: city,
      optiuni,
      alese: optiuniAlese,
    });
  }, [date, start, end, hours, pricePerHour, city, optiuni, optiuniAlese]);

  const total = pret?.total ?? 0;

  /** Verificările de dinainte de trimitere; rulează și înainte de plată. */
  function verifica(): boolean {
    setError("");
    if (!date || !start || !end) {
      setError("Alege data și intervalul orar.");
      return false;
    }
    if (!isAuthenticated) {
      if (nume.trim().length < 2) {
        setError("Scrie numele tău, ca proprietarul să știe cine vine.");
        return false;
      }
      if (telefon.trim().length < 7) {
        setError("Scrie un număr de telefon la care poți fi sunat.");
        return false;
      }
    }
    return true;
  }

  function submit() {
    if (!verifica() || !date) return;
    // Momentul exact e calculat aici, în fusul clientului, nu pe server —
    // altfel rezervarea ajungea în baza de date cu altă oră decât cea aleasă.
    const day = format(date, "yyyy-MM-dd");
    const startTime = localDateTimeToIso(day, start);
    const endTime = localDateTimeToIso(day, end);
    if (!startTime || !endTime) {
      setError("Data sau ora aleasă nu este validă.");
      return;
    }

    startTransition(async () => {
      // Fără cont, rezervarea trece printr-o rută publică și se întoarce cu un
      // link: e singurul fel în care omul își mai poate găsi rezervarea.
      if (!isAuthenticated) {
        try {
          const raspuns = await fetch("/api/rezervari-vizitator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fieldId,
              startTime,
              endTime,
              nume: nume.trim(),
              telefon: telefon.trim(),
              email: emailVizitator.trim() || undefined,
              observatii: notes.trim() || undefined,
            }),
          });
          const date2 = await raspuns.json();
          if (!raspuns.ok) {
            setError(date2.error ?? "Nu am putut trimite cererea.");
            return;
          }
          router.push(new URL(date2.link).pathname);
        } catch {
          setError("A apărut o eroare. Încearcă din nou.");
        }
        return;
      }

      const result = await createBookingRequest({
        fieldId,
        startTime,
        endTime,
        optiuni: optiuniAlese,
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Cererea de rezervare a fost trimisă! O poți urmări în „Rezervările mele”.");
      router.push("/rezervarile-mele");
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <p className="font-heading text-[16px] font-semibold">Rezervă acest teren</p>

      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Data</p>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px]"
              />
            }
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className={date ? "" : "text-muted-foreground"}>
              {date ? format(date, "d MMMM yyyy", { locale: ro }) : "Alege o dată"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(value) => {
                setDate(value);
                setStart("");
                setEnd("");
                setError("");
                setDatePopoverOpen(false);
                if (value) loadOccupied(value);
              }}
              locale={ro}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Ora start</p>
          <Select value={start} onValueChange={(v) => v && pickStart(v)} disabled={!date || loadingSlots}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingSlots ? "Se verifică…" : "Start"} />
            </SelectTrigger>
            <SelectContent>
              {startOptions.map((h) => {
                const taken = busy.has(hourOf(h));
                return (
                  <SelectItem key={h} value={h} className={taken ? "opacity-45" : undefined}>
                    {h}
                    {taken && <span className="ml-1.5 text-[11px]">· ocupat</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Ora sfârșit</p>
          <Select value={end} onValueChange={(v) => v && pickEnd(v)} disabled={!start}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sfârșit" />
            </SelectTrigger>
            <SelectContent>
              {endOptions.map((h) => {
                const taken = endIsBusy(h);
                return (
                  <SelectItem key={h} value={h} className={taken ? "opacity-45" : undefined}>
                    {h}
                    {taken && <span className="ml-1.5 text-[11px]">· ocupat</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {date && !loadingSlots && occupied.length > 0 && (
        <p className="rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
          Deja rezervat în această zi: <span className="font-medium text-foreground">{describeOccupied(occupied)}</span>
        </p>
      )}
      {date && !loadingSlots && occupied.length === 0 && (
        <p className="text-[12px] text-muted-foreground">Toate orele sunt libere în această zi.</p>
      )}

      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Observații (opțional)</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. avem nevoie de mingi." rows={2} />
      </div>

      {/* Fără cont, proprietarul trebuie totuși să știe cine vine și cum îl
          poate suna dacă se schimbă ceva. */}
      {!isAuthenticated && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
          <p className="text-[12.5px] font-medium">Datele tale</p>
          <div>
            <p className="mb-1.5 text-[12.5px] text-muted-foreground">Nume</p>
            <Input value={nume} onChange={(e) => setNume(e.target.value)} placeholder="Ion Popescu" autoComplete="name" />
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] text-muted-foreground">Telefon</p>
            <Input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="0722 123 456"
              type="tel"
              autoComplete="tel"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] text-muted-foreground">Email (opțional)</p>
            <Input
              value={emailVizitator}
              onChange={(e) => setEmailVizitator(e.target.value)}
              placeholder="nume@exemplu.ro"
              type="email"
              autoComplete="email"
            />
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Fără cont primești un link cu care îți vezi și îți anulezi rezervarea. Păstrează-l —
            e singurul mod de a o regăsi. Cu{" "}
            <Link href="/autentificare?tip=personal" className="underline underline-offset-2">
              un cont
            </Link>{" "}
            le ai pe toate la un loc.
          </p>
        </div>
      )}

      {optiuni.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] font-medium text-muted-foreground">În plus</p>
          {optiuni
            .filter((o) => !o.autoLaIntuneric && !o.autoLaFrig)
            .map((optiune) => (
              <label
                key={optiune.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  checked={optiuniAlese.includes(optiune.id)}
                  onChange={(e) =>
                    setOptiuniAlese((curente) =>
                      e.target.checked
                        ? [...curente, optiune.id]
                        : curente.filter((id) => id !== optiune.id)
                    )
                  }
                />
                <span className="flex-1">
                  <span className="block font-medium">{optiune.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {optiune.price} RON {optiune.pricing === "PER_HOUR" ? "/ oră" : "o dată"}
                  </span>
                </span>
              </label>
            ))}

          {/* Nocturna nu se bifează: se pune singură, pentru orele fără lumină. */}
          {optiuni
            .filter((o) => o.autoLaIntuneric || o.autoLaFrig)
            .map((optiune) => {
              const linie = pret?.linii.find((l) => l.id === optiune.id);
              return (
                <div
                  key={optiune.id}
                  className="rounded-lg border border-dashed px-3 py-2 text-[13px]"
                >
                  <span className="block font-medium">{optiune.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {optiune.autoLaFrig
                      ? `${optiune.price} RON ${optiune.pricing === "PER_HOUR" ? "/ oră" : "o dată"}, se adaugă singură în sezonul rece (oct–apr)`
                      : `${optiune.price} RON / oră, se adaugă singură pentru orele de după apus`}
                    {linie ? ` — ${linie.unitati} ${linie.unitati === 1 ? "oră" : "ore"} la intervalul ales` : ""}
                    {pret && !linie ? (optiune.autoLaFrig ? " — data aleasă e în afara sezonului rece" : " — intervalul ales e pe lumină") : ""}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {autoConfirmDays > 0 && (
        <p className="text-[11.5px] text-muted-foreground">
          Rezervările făcute cu cel puțin {autoConfirmDays}{" "}
          {autoConfirmDays === 1 ? "zi" : "zile"} înainte se confirmă automat. Cele de ultim
          moment așteaptă răspunsul proprietarului.
        </p>
      )}

      {pret && (
        <div className="space-y-1.5 rounded-lg bg-muted px-3 py-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Teren · {hours} {hours === 1 ? "oră" : "ore"}
            </span>
            <span className="font-mono tabular-nums">{pret.pretTeren} RON</span>
          </div>
          {pret.linii.map((linie) => (
            <div key={linie.id} className="flex items-center justify-between text-muted-foreground">
              <span>
                {linie.nume}
                {linie.pricing === "PER_HOUR" && ` · ${linie.unitati} ${linie.unitati === 1 ? "oră" : "ore"}`}
              </span>
              <span className="font-mono tabular-nums">{linie.total} RON</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-1.5 font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{total} RON</span>
          </div>
        </div>
      )}

      {pret && <AlegeMetodaPlata metoda={metodaPlata} alege={setMetodaPlata} />}

      {error && <p className="text-[12.5px] text-destructive">{error}</p>}

      <Button
        className="w-full"
        onClick={() => {
          // Plata se deschide doar după ce rezervarea e completă, ca să nu
          // „plătești” și apoi să afli că lipsește numele.
          if (metodaPlata === "card" && pret) {
            if (verifica()) setPlataDeschisa(true);
          } else submit();
        }}
        disabled={isPending}
      >
        {isPending
          ? "Se trimite…"
          : metodaPlata === "card" && pret
            ? `Plătește ${total} RON și rezervă`
            : "Trimite cererea de rezervare"}
      </Button>

      <DialogPlataCard
        deschis={plataDeschisa}
        laInchidere={() => setPlataDeschisa(false)}
        suma={total}
        laPlata={submit}
      />
    </div>
  );
}
