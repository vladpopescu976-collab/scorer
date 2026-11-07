import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { clientulRezervarii } from "@/lib/client-rezervare";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

const mutareSchema = z.object({
  inceput: z.iso.datetime({ message: "Ora de start nu este validă." }),
  sfarsit: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
});

/**
 * Mută un interval notat de proprietar — oră luată la telefon sau eveniment
 * propriu — direct din calendarul aplicației, fără să-l șteargă și să-l scrie
 * din nou.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { id } = await params;
    const date = mutareSchema.parse(await request.json());

    const blocare = await prisma.blockedSlot.findUnique({
      where: { id },
      include: { field: { select: { id: true, ownerId: true } } },
    });
    if (!blocare || blocare.field.ownerId !== sesiune.userId) {
      return eroare("Intervalul blocat nu a fost găsit.", 404);
    }

    const inceput = new Date(date.inceput);
    const sfarsit = new Date(date.sfarsit);
    if (sfarsit <= inceput) return eroare("Ora de sfârșit trebuie să fie după ora de start.", 422);

    try {
      const mutat = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${blocare.field.id}))`;

        const rezervare = await tx.booking.findFirst({
          where: {
            fieldId: blocare.field.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { lt: sfarsit },
            endTime: { gt: inceput },
          },
          include: { customer: { select: { name: true } } },
        });
        if (rezervare) throw new Error(`REZERVAT:${clientulRezervarii(rezervare).nume}`);

        // Intervalul mutat se suprapune cu el însuși, deci se exclude explicit.
        const altul = await tx.blockedSlot.findFirst({
          where: {
            fieldId: blocare.field.id,
            id: { not: blocare.id },
            startTime: { lt: sfarsit },
            endTime: { gt: inceput },
          },
        });
        if (altul) throw new Error("OCUPAT");

        return tx.blockedSlot.update({
          where: { id: blocare.id },
          data: { startTime: inceput, endTime: sfarsit },
        });
      });

      return raspuns({
        id: mutat.id,
        terenId: mutat.fieldId,
        inceput: mutat.startTime.toISOString(),
        sfarsit: mutat.endTime.toISOString(),
        motiv: mutat.reason,
        clientNume: mutat.clientName,
        clientTelefon: mutat.clientPhone,
        serieId: mutat.serieId,
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      if (text.startsWith("REZERVAT:")) {
        return eroare(`Nu poți muta aici: există o rezervare a lui ${text.slice(9)}.`, 409);
      }
      if (text.includes("OCUPAT") || text.includes("blocked_slots_no_overlap")) {
        return eroare("Intervalul ales este deja blocat.", 409);
      }
      if (text.includes("BLOCKED_SLOT_ON_BOOKING")) {
        return eroare("Între timp a apărut o rezervare pe acest interval.", 409);
      }
      throw err;
    }
  } catch (error) {
    return eroareNeasteptata("business-muta-blocare", error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { id } = await params;
    const blocare = await prisma.blockedSlot.findUnique({
      where: { id },
      include: { field: { select: { ownerId: true } } },
    });
    if (!blocare || blocare.field.ownerId !== sesiune.userId) {
      return eroare("Intervalul blocat nu a fost găsit.", 404);
    }

    await prisma.blockedSlot.delete({ where: { id } });
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("business-deblocheaza", error);
  }
}
