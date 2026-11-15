import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expiraRezervarile } from "@/lib/rezervari-expirate";
import { expiraImpartirile } from "@/lib/impartire-plata";
import { MyBookingsClient } from "@/components/dashboard/my-bookings-client";
import { normalizeazaOras } from "@/lib/orase";
import { RezervariFaraCont } from "@/components/rezervare/rezervari-fara-cont";
import { AntetPagina } from "@/components/antet-pagina";

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

  await expiraImpartirile();
  await expiraRezervarile({ customerId: session.user.id });

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: {
      field: {
        select: { id: true, name: true, city: true, openingHour: true, closingHour: true },
      },
      review: { select: { rating: true, comment: true, ownerReply: true } },
      impartire: { select: { cod: true, numarParti: true, _count: { select: { parti: true } } } },
    },
    orderBy: { startTime: "desc" },
  });

  return (
    <>
    <AntetPagina
      eticheta="Rezervări"
      titlu="Rezervările mele."
      accent="Totul într-un loc."
      descriere="Urmărește cererile, mutările propuse și split the bill-urile tale."
    />
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div>
        <MyBookingsClient
          bookings={bookings.map((b) => ({
            ...b,
            totalPrice: Number(b.totalPrice),
            impartire: b.impartire
              ? { cod: b.impartire.cod, numarParti: b.impartire.numarParti, platite: b.impartire._count.parti }
              : null,
            // Orașul apare mereu scris corect, chiar dacă proprietarul l-a
            // salvat cu litere mici sau fără diacritice.
            field: { ...b.field, city: normalizeazaOras(b.field.city) },
          }))}
        />
      </div>
    </div>
    </>
  );
}
