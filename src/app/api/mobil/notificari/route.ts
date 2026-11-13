import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { clientulRezervarii } from "@/lib/client-rezervare";

export const maxDuration = 60;

const ZI = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long" });
const ORA = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" });
const cand = (a: Date, b: Date) => `${ZI.format(a)}, ${ORA.format(a)} – ${ORA.format(b)}`;

/**
 * Notificările contului, cele mai noi primele. Cu `dupa` (dată ISO), doar
 * cele mai noi decât ea: aplicația le arată pe telefon pe cele noi.
 *
 * `deRezolvat`: ce așteaptă acum răspunsul tău, citit direct din rezervări.
 * Apare chiar dacă evenimentul s-a petrecut înainte să existe notificările.
 */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const dupa = new URL(request.url).searchParams.get("dupa");
    const data = dupa ? new Date(dupa) : null;
    const acum = new Date();

    // Dacă tabelul încă nu există (actualizarea bazei nu a rulat), lista e goală,
    // dar „de rezolvat” tot apare.
    const [notificari, necitite] = await Promise.all([
      prisma.notificare
        .findMany({
          where: { userId: sesiune.userId, ...(data && !isNaN(+data) ? { createdAt: { gt: data } } : {}) },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        .catch(() => []),
      prisma.notificare.count({ where: { userId: sesiune.userId, citita: false } }).catch(() => 0),
    ]);

    const deRezolvat =
      sesiune.role === "BUSINESS"
        ? (
            await prisma.booking.findMany({
              where: { field: { ownerId: sesiune.userId }, status: "PENDING", startTime: { gt: acum } },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { customer: { select: { name: true, email: true, phone: true } }, field: { select: { name: true } } },
            })
          ).map((b) => ({
            id: `pending-${b.id}`,
            titlu: "Rezervare de confirmat",
            text: `${clientulRezervarii(b).nume} · ${b.field.name} · ${cand(b.startTime, b.endTime)}`,
            ecran: "rezervari",
          }))
        : (
            await prisma.booking.findMany({
              where: { customerId: sesiune.userId, status: "RESCHEDULE_PROPOSED", startTime: { gt: acum } },
              orderBy: { updatedAt: "desc" },
              take: 20,
              include: { field: { select: { name: true } } },
            })
          ).map((b) => ({
            id: `mutare-${b.id}`,
            titlu: "Terenul îți propune altă oră",
            text: `${b.field.name} · ${
              b.proposedStartTime && b.proposedEndTime ? cand(b.proposedStartTime, b.proposedEndTime) : cand(b.startTime, b.endTime)
            }`,
            ecran: "rezervari",
          }));

    return raspuns({
      necitite: necitite + deRezolvat.length,
      deRezolvat,
      notificari: notificari.map((n) => ({
        id: n.id,
        titlu: n.titlu,
        text: n.text,
        ecran: n.ecran,
        citita: n.citita,
        creataLa: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return eroareNeasteptata("notificari", error);
  }
}
