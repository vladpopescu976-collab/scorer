"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck2, Timer, Gauge } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { AntetPanou, CasetaVerde } from "@/components/antet-pagina";
import { computeKpis, revenueSeries, hoursBySport, type AnalyticsBooking, type AnalyticsField } from "@/lib/analytics";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

type SimpleTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: string | number | readonly (string | number)[]; payload?: unknown }[];
};

function ChartTooltip({ active, payload, label }: SimpleTooltipProps) {
  const entry = payload?.[0];
  if (!active || !entry || entry.value == null) return null;
  const rezervari = (entry.payload as { rezervari?: number } | undefined)?.rezervari ?? 0;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <p className="text-[11.5px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-[13.5px] font-semibold tabular-nums">
        {Number(entry.value).toLocaleString("ro-RO")} RON
      </p>
      <p className="text-[11px] text-muted-foreground">{rezervari} rezervări</p>
    </div>
  );
}

export function OverviewClient({
  bookings,
  fields,
  alerta,
}: {
  bookings: AnalyticsBooking[];
  fields: AnalyticsField[];
  /** Cererile vechi la care n-ai răspuns: sub cardul verde, ca să sară în ochi. */
  alerta?: React.ReactNode;
}) {
  const [range, setRange] = useState(14);

  const kpis = useMemo(() => computeKpis(bookings, fields), [bookings, fields]);
  const chartData = useMemo(() => revenueSeries(bookings, range), [bookings, range]);
  const sportData = useMemo(() => hoursBySport(bookings, fields), [bookings, fields]);
  const maxShare = Math.max(1, ...sportData.map((s) => s.ore));

  return (
    <motion.div variants={container} initial={false} animate="show" className="space-y-6">
      {/* Cardul verde: încasarea lunii mare, ca un panou de bord, și trei casete. */}
      <AntetPanou
        eticheta={`Panou · ${new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}`}
        titlu="Privire de ansamblu."
        accent="Azi, pe scurt."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr] lg:items-end">
          <div>
            <p className="font-display text-[19px] italic text-[#F3EFE6]/70">Încasări estimate luna aceasta</p>
            <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[52px]">
              {kpis.monthRevenue.toLocaleString("ro-RO")}
              <span className="ml-2 text-[20px] font-medium text-[#F3EFE6]/55">RON</span>
            </p>
            <p className="mt-2 text-[12.5px] text-[#F3EFE6]/55">din rezervări confirmate</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <CasetaVerde icon={CalendarCheck2} eticheta="Rezervări" valoare={kpis.totalBookings.toString()} />
            <CasetaVerde icon={Timer} eticheta="Ore ocupate" valoare={`${Math.round(kpis.occupiedHours * 10) / 10} h`} />
            <CasetaVerde icon={Gauge} eticheta="Ocupare · 7 zile" valoare={`${kpis.occupancyRate}%`} />
          </div>
        </div>
      </AntetPanou>

      {alerta}

      <motion.div variants={item}>
        <Card className="rounded-3xl border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-18px_rgba(0,0,0,0.14)]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-[15.5px] font-semibold">Încasări estimate</h3>
                <p className="text-[12.5px] text-muted-foreground">Rezervări confirmate, ultimele {range} zile</p>
              </div>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {[7, 14].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={
                      "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
                      (range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {r} zile
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                    interval={range > 10 ? 1 : 0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `${v} RON`}
                    width={72}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="venit"
                    stroke="var(--primary)"
                    strokeWidth={2.25}
                    fill="url(#revenueFill)"
                    activeDot={{ r: 4.5, stroke: "var(--background)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="rounded-3xl border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-18px_rgba(0,0,0,0.14)]">
          <CardContent className="p-5">
            <h3 className="font-heading text-[15.5px] font-semibold">Ore rezervate pe sport</h3>
            <p className="text-[12.5px] text-muted-foreground">Rezervări confirmate</p>
            {sportData.length === 0 ? (
              <div className="flex h-[160px] items-center justify-center text-[12.5px] text-muted-foreground">
                Nicio rezervare confirmată încă.
              </div>
            ) : (
              <div className="mt-5 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sportData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="sport"
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tick={{ fontSize: 12.5, fill: "var(--foreground)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={({ active, payload }: SimpleTooltipProps) =>
                        active && payload?.[0]?.value != null ? (
                          <div className="rounded-xl border bg-popover px-3 py-2 shadow-lg">
                            <p className="font-mono text-[13px] font-semibold tabular-nums">{payload[0].value} ore</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="ore" radius={[0, 6, 6, 0]} maxBarSize={18}>
                      {sportData.map((entry) => (
                        <Cell key={entry.sport} fill="var(--primary)" fillOpacity={0.35 + (entry.ore / maxShare) * 0.65} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
