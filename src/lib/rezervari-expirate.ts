import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Trece pe „expirat” cererile la care nu s-a răspuns până la ora lor.
 *
 * Fără asta, o cerere pentru 28 august putea fi confirmată pe 1 septembrie:
 * proprietarul apăsa „Aprobă” și clientul primea o confirmare pentru o oră
 * care trecuse. O rezervare expirată nu mai intră în constrângerea de
 * suprapuneri, deci ora redevine liberă de la sine.
 *
 * Se cheamă la citirea listelor și înainte de aprobare, nu dintr-o sarcină
 * programată: proiectul n-are una, iar așa starea e corectă exact atunci când
 * o vede cineva.
 */
export async function expiraRezervarile(
  filtru: Prisma.BookingWhereInput = {}
): Promise<number> {
  const acum = new Date();

  const [cereri, propuneri] = await prisma.$transaction([
    prisma.booking.updateMany({
      where: { ...filtru, status: "PENDING", startTime: { lte: acum } },
      data: { status: "EXPIRED" },
    }),
    // La o mutare propusă contează ora propusă; dacă lipsește, cea originală.
    prisma.booking.updateMany({
      where: {
        ...filtru,
        status: "RESCHEDULE_PROPOSED",
        OR: [
          { proposedStartTime: { lte: acum } },
          { proposedStartTime: null, startTime: { lte: acum } },
        ],
      },
      data: { status: "EXPIRED", proposedStartTime: null, proposedEndTime: null },
    }),
  ]);

  return cereri.count + propuneri.count;
}

/** Adevărat dacă intervalul a început deja, deci nu mai are ce fi confirmat. */
export function aTrecutOra(rezervare: {
  status: string;
  startTime: Date;
  proposedStartTime: Date | null;
}): boolean {
  const relevanta =
    rezervare.status === "RESCHEDULE_PROPOSED" && rezervare.proposedStartTime
      ? rezervare.proposedStartTime
      : rezervare.startTime;
  return relevanta <= new Date();
}
