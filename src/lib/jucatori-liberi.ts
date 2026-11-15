import { after } from "next/server";
import { z } from "zod";
import type { Prisma, SkillLevel, SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { ORASE_ROMANIA, cheieOras, normalizeazaOras } from "@/lib/orase";
import { trimiteNotificare } from "@/lib/push";
import { POZITII } from "@/lib/jucatori-liberi-pozitii";

export { POZITII };

/**
 * „Caută echipă”: jucătorii își pun un anunț despre ei (sport, oraș, poziție),
 * iar echipele îi invită. Invitația îl anunță pe jucător și le arată unul
 * altuia telefonul (doar dacă jucătorul a ales să-l arate).
 */

const SPORTURI = ["FOOTBALL", "BASKETBALL", "TENNIS", "VOLLEYBALL", "HANDBALL", "PADEL", "BADMINTON", "OTHER"] as const;
const NIVELURI = ["INCEPATOR", "MEDIU", "AVANSAT", "COMPETITIV"] as const;

export const anuntJucatorSchema = z
  .object({
    sport: z.enum(SPORTURI, { message: "Alege sportul." }),
    oras: z.string().trim().min(2, "Scrie orașul."),
    pozitii: z.array(z.string().trim()).max(6).optional(),
    nivel: z.enum(NIVELURI).optional(),
    descriere: z.string().trim().max(400, "Descrierea are cel mult 400 de caractere.").optional(),
    arataTelefon: z.boolean().optional(),
    /** 1 = luni … 7 = duminică. */
    zile: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    oraDe: z.number().int().min(0).max(23).optional(),
    oraPana: z.number().int().min(1).max(24).optional(),
  })
  .refine((d) => d.oraDe == null || d.oraPana == null || d.oraPana > d.oraDe, {
    message: "Ora de final trebuie să fie după cea de început.",
    path: ["oraPana"],
  })
  // Orașul vine din listă: scris greșit, jucătorul n-ar mai fi găsit de nimeni.
  .refine((d) => ORASE_ROMANIA.some((o) => cheieOras(o) === cheieOras(d.oras)), {
    message: "Alege orașul din listă.",
    path: ["oras"],
  })
  .refine((d) => (d.pozitii ?? []).every((p) => POZITII[d.sport].includes(p)), {
    message: "Poziția nu se potrivește cu sportul.",
    path: ["pozitii"],
  });

export type AnuntJucatorInput = z.input<typeof anuntJucatorSchema>;

export type AnuntJucatorPublic = {
  id: string;
  sport: SportType;
  oras: string;
  pozitii: string[];
  nivel: SkillLevel | null;
  descriere: string | null;
  /** 1 = luni … 7 = duminică; goală = oricând. */
  zile: number[];
  oraDe: number | null;
  oraPana: number | null;
  creatLa: string;
  jucator: { id: string; nume: string; poza: string | null };
  esteAlMeu: boolean;
  lAmInvitat: boolean;
  /** Jucătorul primește invitații; doar el îl poate opri. */
  primesteInvitatii: boolean;
  /** Telefonul jucătorului: doar pentru cine l-a invitat, dacă l-a arătat. */
  telefonJucator: string | null;
  /** Pentru propriul anunț: cine te-a invitat, cu telefonul lor. */
  invitatii: { id: string; nume: string; poza: string | null; telefon: string | null; mesaj: string | null }[];
};

const include = {
  user: { select: { id: true, name: true, image: true, phone: true } },
  invitatii: {
    orderBy: { createdAt: "desc" },
    include: { dinPartea: { select: { id: true, name: true, image: true, phone: true } } },
  },
} satisfies Prisma.AnuntJucatorInclude;

type AnuntCuDetalii = Prisma.AnuntJucatorGetPayload<{ include: typeof include }>;

function serializeaza(a: AnuntCuDetalii, vizitatorId: string | null): AnuntJucatorPublic {
  const esteAlMeu = vizitatorId === a.userId;
  const lAmInvitat = !!vizitatorId && a.invitatii.some((i) => i.dinParteaId === vizitatorId);
  return {
    id: a.id,
    sport: a.sport,
    oras: normalizeazaOras(a.oras),
    pozitii: a.pozitii,
    nivel: a.nivel,
    descriere: a.descriere,
    zile: [...a.zile].sort((x, y) => x - y),
    oraDe: a.oraDe,
    oraPana: a.oraPana,
    creatLa: a.createdAt.toISOString(),
    jucator: { id: a.user.id, nume: a.user.name, poza: a.user.image },
    esteAlMeu,
    lAmInvitat,
    primesteInvitatii: a.primesteInvitatii,
    telefonJucator: lAmInvitat && a.arataTelefon ? a.user.phone : null,
    invitatii: esteAlMeu
      ? a.invitatii.map((i) => ({
          id: i.dinPartea.id,
          nume: i.dinPartea.name,
          poza: i.dinPartea.image,
          telefon: i.dinPartea.phone,
          mesaj: i.mesaj,
        }))
      : [],
  };
}

/** Jucătorii care caută echipă, cei mai noi primii. Propriul anunț apare primul. */
export async function listaJucatoriLiberi(
  filtre: { oras?: string | null; sport?: string | null },
  vizitatorId: string | null
): Promise<AnuntJucatorPublic[]> {
  const where: Prisma.AnuntJucatorWhereInput = {};
  if (filtre.oras?.trim()) where.orasCheie = { contains: cheieOras(filtre.oras), mode: "insensitive" };
  if (filtre.sport && (SPORTURI as readonly string[]).includes(filtre.sport)) where.sport = filtre.sport as SportType;

  const anunturi = await prisma.anuntJucator.findMany({ where, orderBy: { updatedAt: "desc" }, take: 60, include });
  return anunturi
    .map((a) => serializeaza(a, vizitatorId))
    .sort((a, b) => Number(b.esteAlMeu) - Number(a.esteAlMeu));
}

/** Pune sau actualizează anunțul jucătorului pentru sportul ales. */
export async function salveazaAnuntJucator(userId: string, input: AnuntJucatorInput): Promise<AnuntJucatorPublic> {
  const date = anuntJucatorSchema.parse(input);
  const valori = {
    oras: normalizeazaOras(date.oras),
    orasCheie: cheieOras(date.oras),
    pozitii: date.pozitii ?? [],
    nivel: date.nivel ?? null,
    descriere: date.descriere || null,
    arataTelefon: date.arataTelefon ?? true,
    zile: [...new Set(date.zile ?? [])],
    oraDe: date.oraDe ?? null,
    oraPana: date.oraPana ?? null,
  };
  const anunt = await prisma.anuntJucator.upsert({
    where: { userId_sport: { userId, sport: date.sport } },
    create: { userId, sport: date.sport, ...valori },
    update: valori,
    include,
  });
  return serializeaza(anunt, userId);
}

export async function stergeAnuntJucator(id: string, userId: string) {
  const anunt = await prisma.anuntJucator.findUnique({ where: { id }, select: { userId: true } });
  if (!anunt || anunt.userId !== userId) throw new ActionError("Doar tu îți poți șterge anunțul.");
  await prisma.anuntJucator.delete({ where: { id } });
}

/** O echipă îl invită pe jucător. */
export async function invitaJucator(anuntId: string, userId: string, mesaj?: string | null): Promise<AnuntJucatorPublic> {
  const anunt = await prisma.anuntJucator.findUnique({
    where: { id: anuntId },
    select: { userId: true, sport: true, primesteInvitatii: true },
  });
  if (!anunt) throw new ActionError("Anunțul nu mai există.");
  if (anunt.userId === userId) throw new ActionError("Nu te poți invita singur.");
  if (!anunt.primesteInvitatii) throw new ActionError("Jucătorul nu mai primește invitații momentan.");

  const curat = mesaj?.trim().slice(0, 300) || null;
  await prisma.invitatieJucator.upsert({
    where: { anuntId_dinParteaId: { anuntId, dinParteaId: userId } },
    create: { anuntId, dinParteaId: userId, mesaj: curat },
    update: { mesaj: curat },
  });

  const cine = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
  after(() =>
    trimiteNotificare(anunt.userId, {
      titlu: "Te vor în echipă!",
      text: `${cine?.name ?? "O echipă"}${cine?.phone ? ` · ${cine.phone}` : ""}${curat ? ` · „${curat}”` : ""}`,
      date: { ecran: "meciuri" },
    })
  );

  const actual = await prisma.anuntJucator.findUniqueOrThrow({ where: { id: anuntId }, include });
  return serializeaza(actual, userId);
}

/** Jucătorul pornește sau oprește invitațiile. Doar el poate. */
export async function seteazaInvitatii(id: string, userId: string, deschis: boolean) {
  const anunt = await prisma.anuntJucator.findUnique({ where: { id }, select: { userId: true } });
  if (!anunt || anunt.userId !== userId) throw new ActionError("Doar tu poți schimba asta.");
  await prisma.anuntJucator.update({ where: { id }, data: { primesteInvitatii: deschis } });
}
