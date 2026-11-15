import { after } from "next/server";
import { z } from "zod";
import type { SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { normalizeazaOras } from "@/lib/orase";
import { trimiteNotificare } from "@/lib/push";

/**
 * Notele de după meci: organizatorul își notează jucătorii acceptați, iar ei
 * pe organizator. Se poate nota după ce meciul s-a jucat (la o oră de la
 * început), câte o notă de la fiecare pentru fiecare, la fiecare meci.
 */

const DUPA_INCEPUT_MS = 60 * 60_000;

export const notaSchema = z.object({
  destinatarId: z.string().min(1),
  nota: z.number().int().min(1, "Alege între 1 și 5 stele.").max(5, "Alege între 1 și 5 stele."),
  comentariu: z.string().trim().max(400, "Comentariul are cel mult 400 de caractere.").optional(),
});

export type MeciDeEvaluat = {
  id: string;
  sport: SportType;
  oras: string;
  locatie: string | null;
  inceput: string;
  /** Pe cine poți nota la acest meci și dacă l-ai notat deja. */
  persoane: { id: string; nume: string; poza: string | null; rol: "organizator" | "jucător"; notaMea: number | null }[];
};

/** Meciurile jucate (ultimele 30 de zile) în care ai pe cine nota. */
export async function meciuriDeEvaluat(userId: string): Promise<MeciDeEvaluat[]> {
  const acum = Date.now();
  const meciuri = await prisma.anuntMeci.findMany({
    where: {
      inceput: { lte: new Date(acum - DUPA_INCEPUT_MS), gte: new Date(acum - 30 * 86_400_000) },
      OR: [{ autorId: userId }, { jucatori: { some: { userId, status: "ACCEPTAT" } } }],
    },
    orderBy: { inceput: "desc" },
    include: {
      autor: { select: { id: true, name: true, image: true } },
      jucatori: { where: { status: "ACCEPTAT" }, include: { user: { select: { id: true, name: true, image: true } } } },
      note: { where: { autorId: userId }, select: { destinatarId: true, nota: true } },
    },
  });

  return meciuri
    .map((m) => {
      const notaMea = (id: string) => m.note.find((n) => n.destinatarId === id)?.nota ?? null;
      const persoane: MeciDeEvaluat["persoane"] =
        m.autorId === userId
          ? m.jucatori.map((j) => ({ id: j.user.id, nume: j.user.name, poza: j.user.image, rol: "jucător", notaMea: notaMea(j.user.id) }))
          : [{ id: m.autor.id, nume: m.autor.name, poza: m.autor.image, rol: "organizator", notaMea: notaMea(m.autor.id) }];
      return {
        id: m.id,
        sport: m.sport,
        oras: normalizeazaOras(m.oras),
        locatie: m.locatie,
        inceput: m.inceput.toISOString(),
        persoane,
      };
    })
    .filter((m) => m.persoane.length > 0);
}

export async function noteazaJucator(anuntId: string, autorId: string, input: z.input<typeof notaSchema>) {
  const date = notaSchema.parse(input);
  if (date.destinatarId === autorId) throw new ActionError("Nu te poți nota singur.");

  const anunt = await prisma.anuntMeci.findUnique({
    where: { id: anuntId },
    select: { autorId: true, inceput: true, jucatori: { where: { status: "ACCEPTAT" }, select: { userId: true } } },
  });
  if (!anunt) throw new ActionError("Meciul nu mai există.");
  if (anunt.inceput.getTime() + DUPA_INCEPUT_MS > Date.now()) throw new ActionError("Poți nota după ce se joacă meciul.");

  const jucatori = new Set(anunt.jucatori.map((j) => j.userId));
  const permis =
    (autorId === anunt.autorId && jucatori.has(date.destinatarId)) ||
    (jucatori.has(autorId) && date.destinatarId === anunt.autorId);
  if (!permis) throw new ActionError("Poți nota doar organizatorul sau jucătorii din meciul tău.");

  const existenta = await prisma.notaJucator.findUnique({
    where: { anuntId_autorId_destinatarId: { anuntId, autorId, destinatarId: date.destinatarId } },
    select: { id: true },
  });
  await prisma.notaJucator.upsert({
    where: { anuntId_autorId_destinatarId: { anuntId, autorId, destinatarId: date.destinatarId } },
    create: { anuntId, autorId, destinatarId: date.destinatarId, nota: date.nota, comentariu: date.comentariu || null },
    update: { nota: date.nota, comentariu: date.comentariu || null },
  });

  if (!existenta) {
    const autor = await prisma.user.findUnique({ where: { id: autorId }, select: { name: true } });
    after(() =>
      trimiteNotificare(date.destinatarId, {
        titlu: "Ai primit o notă după meci",
        text: `${"★".repeat(date.nota)}${"☆".repeat(5 - date.nota)} de la ${autor?.name ?? "un jucător"}`,
        date: { ecran: "cont" },
      })
    );
  }
}

export type NotePrimite = {
  medie: number | null;
  numar: number;
  note: { id: string; nota: number; comentariu: string | null; data: string; sport: SportType; autor: { nume: string; poza: string | null } }[];
};

/** Notele primite de un cont, pentru pagina de cont. */
export async function notePrimite(userId: string): Promise<NotePrimite> {
  const note = await prisma.notaJucator.findMany({
    where: { destinatarId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { autor: { select: { name: true, image: true } }, anunt: { select: { sport: true } } },
  });
  const agregat = await prisma.notaJucator.aggregate({ where: { destinatarId: userId }, _avg: { nota: true }, _count: true });
  return {
    medie: agregat._avg.nota ? Math.round(agregat._avg.nota * 10) / 10 : null,
    numar: agregat._count,
    note: note.map((n) => ({
      id: n.id,
      nota: n.nota,
      comentariu: n.comentariu,
      data: n.createdAt.toISOString(),
      sport: n.anunt.sport,
      autor: { nume: n.autor.name, poza: n.autor.image },
    })),
  };
}
