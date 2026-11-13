import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expiraRezervarile } from "@/lib/rezervari-expirate";
import { BookingsTable } from "@/components/dashboard/bookings-table";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function BusinessBookingsPage() {
  const session = await auth();
  const ownerId = session!.user.id;

  // Cererile la care nu s-a raspuns pana la ora lor nu mai pot fi confirmate.
  await expiraRezervarile({ field: { ownerId } });

  const [bookings, fields] = await Promise.all([
    prisma.booking.findMany({
      where: { field: { ownerId } },
      include: {
        customer: { select: { name: true, phone: true } },
        field: { select: { id: true, name: true } },
        extras: true,
      },
      // Cea mai nouă cerere sus: o rezervare făcută acum apare prima.
      orderBy: { createdAt: "desc" },
    }),
    prisma.field.findMany({ where: { ownerId }, select: { id: true, name: true, sportType: true } }),
  ]);

  return (
    <BookingsTable
      bookings={bookings.map((b) => ({
        ...b,
        totalPrice: Number(b.totalPrice),
        // Decimal-urile Prisma nu trec ca atare spre componenta client.
        extras: b.extras.map((e) => ({
          id: e.id,
          name: e.name,
          units: e.units,
          pricing: e.pricing,
          total: Number(e.total),
        })),
      }))}
      fields={fields}
    />
  );
}
