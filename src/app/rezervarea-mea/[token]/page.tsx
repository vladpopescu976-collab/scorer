import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AnuleazaRezervarea } from "@/components/rezervare/anuleaza-rezervarea";
import { rezervareaDinToken } from "@/lib/rezervari-vizitator";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { normalizeazaOras } from "@/lib/orase";

export const metadata: Metadata = { title: "Rezervarea mea — Scorer" };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const formatZi = new Intl.DateTimeFormat("ro-RO", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const formatOra = new Intl.DateTimeFormat("ro-RO", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export default async function RezervareaMeaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rezervare = await rezervareaDinToken(token);

  if (!rezervare) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <CalendarX className="h-6 w-6" />
            </div>
            <CardTitle>Link invalid</CardTitle>
            <CardDescription>
              Linkul nu duce la nicio rezervare. Verifică dacă l-ai copiat întreg.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" nativeButton={false} render={<Link href="/cauta-terenuri" />}>
              Caută un teren
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const incheiata = rezervare.endTime < new Date();
  const sePoateAnula =
    !incheiata && rezervare.status !== "CANCELLED" && rezervare.status !== "REJECTED";

  const zi = formatZi.format(rezervare.startTime);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{rezervare.field.name}</CardTitle>
              <CardDescription className="mt-1">
                Rezervarea lui {rezervare.guestName}
              </CardDescription>
            </div>
            <StatusBadge status={rezervare.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="divide-y rounded-xl border">
            <Rand eticheta="Ziua" valoare={zi.charAt(0).toUpperCase() + zi.slice(1)} />
            <Rand
              eticheta="Ora"
              valoare={`${formatOra.format(rezervare.startTime)} – ${formatOra.format(rezervare.endTime)}`}
            />
            {rezervare.extras.map((optiune) => (
              <Rand
                key={optiune.id}
                eticheta={
                  optiune.pricing === "PER_HOUR"
                    ? `${optiune.name} · ${optiune.units} ${optiune.units === 1 ? "oră" : "ore"}`
                    : optiune.name
                }
                valoare={`${Number(optiune.total)} RON`}
              />
            ))}
            <Rand eticheta="Total" valoare={`${Number(rezervare.totalPrice)} RON`} />
            {rezervare.guestPhone ? (
              <Rand eticheta="Telefonul tău" valoare={rezervare.guestPhone} />
            ) : null}
          </dl>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {rezervare.field.address}, {normalizeazaOras(rezervare.field.city)}
            </p>
            {rezervare.field.contactPhone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                {rezervare.field.contactPhone}
              </p>
            )}
          </div>

          {rezervare.status === "PENDING" && (
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
              Cererea a ajuns la proprietar. Revino pe acest link ca să vezi dacă a fost
              acceptată — păstrează-l, e singurul mod de a-ți regăsi rezervarea fără cont.
            </p>
          )}

          {sePoateAnula && <AnuleazaRezervarea token={token} />}
        </CardContent>
      </Card>
    </div>
  );
}

function Rand({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{eticheta}</dt>
      <dd className="text-right text-sm font-medium">{valoare}</dd>
    </div>
  );
}
