import { z } from "zod";
import type { Prisma, SkillLevel, SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { cheieOras, normalizeazaOras } from "@/lib/orase";
import { esteFormatValid } from "@/lib/formate-teren";

/**
 * „Găsește meci”: anunțuri „mai avem nevoie de jucători”, alăturarea la ele
 * și căutarea jucătorilor care au ales să fie vizibili. Aceeași logică pentru
 * site și aplicație.
 */

const SPORTURI = ["FOOTBALL", "BASKETBALL", "TENNIS", "VOLLEYBALL", "HANDBALL", "PADEL", "BADMINTON", "OTHER"] as const;
const NIVELURI = ["INCEPATOR", "MEDIU", "AVANSAT", "COMPETITIV"] as const;

export const anuntSchema = z
  .object({
    sport: z.enum(SPORTURI, { message: "Alege sportul." }),
    oras: z.string().trim().min(2, "Scrie orașul."),
    inceput: z.iso.datetime({ message: "Alege data și ora meciului." }),
    locatie: z.string().trim().max(120, "Locația are cel mult 120 de caractere.").optional(),
    format: z.string().trim().max(10).optional(),
    jucatoriNecesari: z
      .number({ message: "Spune câți jucători mai cauți." })
      .int()
      .min(1, "Cauți cel puțin un jucător.")
      .max(30, "Cel mult 30 de jucători."),
    nivel: z.enum(NIVELURI).optional(),
    descriere: z.string().trim().max(400, "Descrierea are cel mult 400 de caractere.").optional(),
    arataTelefon: z.boolean().optional(),
  })
  .refine((d) => new Date(d.inceput).getTime() > Date.now() - 60_000, {
    message: "Meciul trebuie să fie în viitor.",
    path: ["inceput"],
  })
  .refine((d) => !d.format || esteFormatValid(d.sport, d.format), {
    message: "Dimensiunea nu se potrivește cu sportul.",
    path: ["format"],
  });

export type AnuntInput = z.input<typeof anuntSchema>;

export type MeciPublic = {
  id: string;
  sport: SportType;
  oras: string;
  inceput: string;
  locatie: string | null;
  format: string | null;
  jucatoriNecesari: number;
  jucatoriAlaturati: number;
  nivel: SkillLevel | null;
  descriere: string | null;
  organizator: { id: string; nume: string; poza: string | null };
  /** Telefonul organizatorului: doar pentru cei alăturați, dacă l-a arătat. */
  telefonOrganizator: string | null;
  esteAlMeu: boolean;
  mAmAlaturat: boolean;
  jucatori: { id: string; nume: string; poza: string | null }[];
};

const includeMeci = {
  autor: { select: { id: true, name: true, image: true, phone: true } },
  jucatori: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  },
} satisfies Prisma.AnuntMeciInclude;

type MeciCuDetalii = Prisma.AnuntMeciGetPayload<{ include: typeof includeMeci }>;

function serializeaza(m: MeciCuDetalii, vizitatorId: string | null): MeciPublic {
  const mAmAlaturat = !!vizitatorId && m.jucatori.some((j) => j.userId === vizitatorId);
  const esteAlMeu = vizitatorId === m.autorId;
  return {
    id: m.id,
    sport: m.sport,
    oras: normalizeazaOras(m.oras),
    inceput: m.inceput.toISOString(),
    locatie: m.locatie,
    format: m.format,
    jucatoriNecesari: m.jucatoriNecesari,
    jucatoriAlaturati: m.jucatori.length,
    nivel: m.nivel,
    descriere: m.descriere,
    organizator: { id: m.autor.id, nume: m.autor.name, poza: m.autor.image },
    telefonOrganizator: mAmAlaturat && m.arataTelefon ? m.autor.phone : null,
    esteAlMeu: esteAlMeu,
    mAmAlaturat,
    jucatori: m.jucatori.map((j) => ({ id: j.user.id, nume: j.user.name, poza: j.user.image })),
  };
}

/** Meciurile care urmează, cele mai apropiate întâi. */
export async function listaMeciuri(
  filtre: { oras?: string | null; sport?: string | null },
  vizitatorId: string | null
): Promise<MeciPublic[]> {
  const where: Prisma.AnuntMeciWhereInput = { inceput: { gte: new Date(Date.now() - 60 * 60_000) } };
  if (filtre.oras?.trim()) where.orasCheie = { contains: cheieOras(filtre.oras), mode: "insensitive" };
  if (filtre.sport && (SPORTURI as readonly string[]).includes(filtre.sport)) where.sport = filtre.sport as SportType;

  const meciuri = await prisma.anuntMeci.findMany({
    where,
    orderBy: { inceput: "asc" },
    take: 60,
    include: includeMeci,
  });
  return meciuri.map((m) => serializeaza(m, vizitatorId));
}

export async function creeazaMeci(autorId: string, input: AnuntInput): Promise<MeciPublic> {
  const date = anuntSchema.parse(input);
  const creat = await prisma.anuntMeci.create({
    data: {
      autorId,
      sport: date.sport,
      oras: normalizeazaOras(date.oras),
      orasCheie: cheieOras(date.oras),
      inceput: new Date(date.inceput),
      locatie: date.locatie || null,
      format: date.format || null,
      jucatoriNecesari: date.jucatoriNecesari,
      nivel: date.nivel ?? null,
      descriere: date.descriere || null,
      arataTelefon: date.arataTelefon ?? true,
    },
    include: includeMeci,
  });
  return serializeaza(creat, autorId);
}

export async function alaturaMeci(anuntId: string, userId: string): Promise<MeciPublic> {
  return prisma.$transaction(async (tx) => {
    // Blocăm anunțul cât numărăm, ca două alăturări simultane să nu treacă de limită.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${anuntId}))`;
    const anunt = await tx.anuntMeci.findUnique({ where: { id: anuntId }, include: includeMeci });
    if (!anunt) throw new ActionError("Anunțul nu mai există.");
    if (anunt.autorId === userId) throw new ActionError("Ești organizatorul acestui meci.");
    if (anunt.inceput.getTime() < Date.now()) throw new ActionError("Meciul a început deja.");
    if (anunt.jucatori.some((j) => j.userId === userId)) return serializeaza(anunt, userId);
    if (anunt.jucatori.length >= anunt.jucatoriNecesari) throw new ActionError("S-au strâns deja toți jucătorii.");

    await tx.jucatorMeci.create({ data: { anuntId, userId } });
    const actual = await tx.anuntMeci.findUniqueOrThrow({ where: { id: anuntId }, include: includeMeci });
    return serializeaza(actual, userId);
  });
}

export async function parasesteMeci(anuntId: string, userId: string) {
  await prisma.jucatorMeci.deleteMany({ where: { anuntId, userId } });
}

export async function stergeMeci(anuntId: string, userId: string) {
  const anunt = await prisma.anuntMeci.findUnique({ where: { id: anuntId }, select: { autorId: true } });
  if (!anunt || anunt.autorId !== userId) throw new ActionError("Doar organizatorul poate șterge anunțul.");
  await prisma.anuntMeci.delete({ where: { id: anuntId } });
}

export type JucatorPublic = {
  id: string;
  nume: string;
  poza: string | null;
  oras: string | null;
  sporturi: SportType[];
  nivel: SkillLevel | null;
};

/** Jucătorii care au ales să apară în căutare. Fără email sau telefon. */
export async function cautaJucatori(filtre: {
  oras?: string | null;
  nume?: string | null;
  sport?: string | null;
}): Promise<JucatorPublic[]> {
  const where: Prisma.UserWhereInput = { vizibilInCautare: true, role: "PERSONAL" };
  if (filtre.oras?.trim()) where.city = { contains: filtre.oras.trim(), mode: "insensitive" };
  if (filtre.nume?.trim()) where.name = { contains: filtre.nume.trim(), mode: "insensitive" };
  if (filtre.sport && (SPORTURI as readonly string[]).includes(filtre.sport)) {
    where.sports = { has: filtre.sport as SportType };
  }
  const useri = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: 60,
    select: { id: true, name: true, image: true, city: true, sports: true, skillLevel: true },
  });
  return useri.map((u) => ({
    id: u.id,
    nume: u.name,
    poza: u.image,
    oras: u.city ? normalizeazaOras(u.city) : null,
    sporturi: u.sports,
    nivel: u.skillLevel,
  }));
}

export async function seteazaVizibilitate(userId: string, vizibil: boolean) {
  await prisma.user.update({ where: { id: userId }, data: { vizibilInCautare: vizibil } });
}
