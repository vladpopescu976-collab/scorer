import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

const creeazaSchema = z.object({
  terenId: z.string().min(1),
  nume: z
    .string({ message: "Scrie o denumire." })
    .trim()
    .min(2, "Scrie o denumire.")
    .max(60, "Denumirea este prea lungă."),
  pret: z.number({ message: "Prețul este obligatoriu." }).positive("Prețul trebuie să fie mai mare decât 0."),
  peOra: z.boolean().optional().default(true),
  automatLaIntuneric: z.boolean().optional().default(false),
});

/** Adaugă o opțiune plătită pe un teren al proprietarului. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const date = creeazaSchema.parse(await request.json());

    const teren = await prisma.field.findUnique({
      where: { id: date.terenId },
      select: { ownerId: true },
    });
    if (!teren || teren.ownerId !== sesiune.userId) {
      return eroare("Terenul nu a fost găsit.", 404);
    }

    // O opțiune care se pune singură la întuneric se taxează pe oră; „o dată
    // pe rezervare” n-ar avea ce înmulți cu orele de după apus.
    if (date.automatLaIntuneric && !date.peOra) {
      return eroare("O opțiune care se adaugă la întuneric se taxează pe oră.", 422);
    }

    const optiune = await prisma.fieldExtra.create({
      data: {
        fieldId: date.terenId,
        name: date.nume,
        price: date.pret,
        pricing: date.peOra ? "PER_HOUR" : "PER_BOOKING",
        autoLaIntuneric: date.automatLaIntuneric,
      },
    });

    return raspuns(
      {
        id: optiune.id,
        nume: optiune.name,
        pret: Number(optiune.price),
        peOra: optiune.pricing === "PER_HOUR",
        automatLaIntuneric: optiune.autoLaIntuneric,
      },
      201
    );
  } catch (error) {
    return eroareNeasteptata("business-optiuni", error);
  }
}

/** Șterge o opțiune. Rezervările deja făcute păstrează copia lor. */
export async function DELETE(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { optiuneId } = z.object({ optiuneId: z.string().min(1) }).parse(await request.json());

    const optiune = await prisma.fieldExtra.findUnique({
      where: { id: optiuneId },
      select: { field: { select: { ownerId: true } } },
    });
    if (!optiune || optiune.field.ownerId !== sesiune.userId) {
      return eroare("Opțiunea nu a fost găsită.", 404);
    }

    await prisma.fieldExtra.delete({ where: { id: optiuneId } });
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("business-optiuni-stergere", error);
  }
}
