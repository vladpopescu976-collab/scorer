import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expiraRezervarile } from "@/lib/rezervari-expirate";
import { MyBookingsClient } from "@/components/dashboard/my-bookings-client";
import { normalizeazaOras } from "@/lib/orase";
import { RezervariFaraCont } from "@/components/rezervare/rezervari-fara-cont";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function MyBookingsPage() {
  const session = await auth();
  // Fără cont nu mai trimitem direct la autentificare: cine a rezervat ca
  // vizitator își poate primi linkurile pe email.
  if (!session?.user) {
    return <RezervariFaraCont />;
  }

  await expiraRezervarile({ customerId: session.user.id });

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: {
      field: {
        select: { id: true, name: true, city: true, openingHour: true, closingHour: true },
      },
      review: { select: { rating: true, comment: true, ownerReply: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Rezervările mele</h1>
      <p className="mt-1 text-muted-foreground">Urmărește statusul cererilor tale de rezervare.</p>

      <div className="mt-8">
        <MyBookingsClient
          bookings={bookings.map((b) => ({
            ...b,
            totalPrice: Number(b.totalPrice),
            // Orașul apare mereu scris corect, chiar dacă proprietarul l-a
            // salvat cu litere mici sau fără diacritice.
            field: { ...b.field, city: normalizeazaOras(b.field.city) },
          }))}
        />
      </div>
    </div>
  );
}
