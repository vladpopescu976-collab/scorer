import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { trimiteNotificare } from "@/lib/push";

/** Proprietarul află de o recenzie nouă la terenul lui. */
export function anuntaRecenzieNoua(fieldId: string, nota: number) {
  after(async () => {
    const teren = await prisma.field.findUnique({ where: { id: fieldId }, select: { ownerId: true, name: true } });
    if (!teren) return;
    await trimiteNotificare(teren.ownerId, {
      titlu: "Recenzie nouă",
      text: `${"★".repeat(nota)}${"☆".repeat(5 - nota)} · ${teren.name}`,
      date: { ecran: "recenzii" },
    });
  });
}

/** Clientul află că proprietarul i-a răspuns la recenzie. */
export function anuntaRaspunsLaRecenzie(reviewId: string) {
  after(async () => {
    const recenzie = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { authorId: true, field: { select: { name: true } } },
    });
    if (!recenzie) return;
    await trimiteNotificare(recenzie.authorId, {
      titlu: "Ți-au răspuns la recenzie",
      text: recenzie.field.name,
      date: { ecran: "rezervari" },
    });
  });
}
