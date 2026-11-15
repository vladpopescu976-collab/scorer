import { z } from "zod";
import type { Prisma, SkillLevel, SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { ORASE_ROMANIA, cheieOras, normalizeazaOras } from "@/lib/orase";
import { esteFormatValid } from "@/lib/formate-teren";
import { phoneSchema } from "@/lib/validations/field";
import { POZITII } from "@/lib/jucatori-liberi-pozitii";
import { after } from "next/server";
import { trimiteNotificare } from "@/lib/push";

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
    /** Lipsă: se ia din cont. */
    telefon: z.string().trim().max(20).optional(),
  })
  // Orașul vine din listă: scris greșit, anunțul n-ar mai fi găsit de nimeni.
  .refine((d) => ORASE_ROMANIA.some((o) => cheieOras(o) === cheieOras(d.oras)), {
    message: "Alege orașul din listă.",
    path: ["oras"],
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
  /** Ești acceptat în meci. */
  mAmAlaturat: boolean;
  /** Cererea ta: în așteptare, acceptată sau refuzată; null dacă n-ai cerut. */
  cerereaMea: "CERERE" | "ACCEPTAT" | "RESPINS" | null;
  /** Cei acceptați. Telefonul se vede doar de organizator, ca să-i poată suna. */
  jucatori: JucatorInMeci[];
  /** Doar pentru organizator: cine a cerut să vină și așteaptă răspuns. */
  cereri: JucatorInMeci[];
};

export type JucatorInMeci = {
  id: string;
  nume: string;
  poza: string | null;
  telefon: string | null;
  pozitii: string[];
  nivel: SkillLevel | null;
};

const includeMeci = {
  autor: { select: { id: true, name: true, image: true, phone: true } },
  jucatori: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, image: true, phone: true } } },
  },
} satisfies Prisma.AnuntMeciInclude;

type MeciCuDetalii = Prisma.AnuntMeciGetPayload<{ include: typeof includeMeci }>;

function serializeaza(m: MeciCuDetalii, vizitatorId: string | null): MeciPublic {
  const esteAlMeu = vizitatorId === m.autorId;
  const acceptati = m.jucatori.filter((j) => j.status === "ACCEPTAT");
  const aMea = vizitatorId ? m.jucatori.find((j) => j.userId === vizitatorId) : undefined;
  const mAmAlaturat = aMea?.status === "ACCEPTAT";
  const descrie = (j: MeciCuDetalii["jucatori"][number]): JucatorInMeci => ({
    id: j.user.id,
    nume: j.user.name,
    poza: j.user.image,
    telefon: esteAlMeu ? (j.telefon ?? j.user.phone) : null,
    pozitii: j.pozitii,
    nivel: j.nivel,
  });
  return {
    id: m.id,
    sport: m.sport,
    oras: normalizeazaOras(m.oras),
    inceput: m.inceput.toISOString(),
    locatie: m.locatie,
    format: m.format,
    jucatoriNecesari: m.jucatoriNecesari,
    jucatoriAlaturati: acceptati.length,
    nivel: m.nivel,
    descriere: m.descriere,
    organizator: { id: m.autor.id, nume: m.autor.name, poza: m.autor.image },
    telefonOrganizator: mAmAlaturat ? (m.telefon ?? m.autor.phone) : null,
    esteAlMeu: esteAlMeu,
    mAmAlaturat,
    cerereaMea: (aMea?.status as MeciPublic["cerereaMea"]) ?? null,
    jucatori: acceptati.map(descrie),
    cereri: esteAlMeu ? m.jucatori.filter((j) => j.status === "CERERE").map(descrie) : [],
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
  const telefon = await telefonObligatoriu(autorId, date.telefon, "Lasă un număr de telefon, ca jucătorii să te poată suna.");
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
      arataTelefon: true,
      telefon,
    },
    include: includeMeci,
  });
  return serializeaza(creat, autorId);
}

/**
 * Cererea de a veni la meci: telefonul e obligatoriu (organizatorul te sună
 * dacă nu apari), plus poziția și nivelul, ca organizatorul să aleagă. Pot
 * cere mai mulți decât locurile; organizatorul decide pe cine ia.
 */
export async function aplicaLaMeci(
  anuntId: string,
  userId: string,
  date: { telefon?: string | null; pozitii?: string[]; nivel?: string | null }
): Promise<MeciPublic> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, name: true } });
  const telefonText = date.telefon?.trim() || user?.phone?.trim() || "";
  const verificat = phoneSchema.safeParse(telefonText);
  if (!verificat.success) {
    throw new ActionError(telefonText ? "Numărul de telefon nu pare valid." : "Ca să te alături, lasă un număr de telefon.");
  }
  const nivel = date.nivel && (NIVELURI as readonly string[]).includes(date.nivel) ? (date.nivel as SkillLevel) : null;

  const anunt = await prisma.anuntMeci.findUnique({ where: { id: anuntId }, include: includeMeci });
  if (!anunt) throw new ActionError("Anunțul nu mai există.");
  if (anunt.autorId === userId) throw new ActionError("Ești organizatorul acestui meci.");
  if (anunt.inceput.getTime() < Date.now()) throw new ActionError("Meciul a început deja.");
  const existenta = anunt.jucatori.find((j) => j.userId === userId);
  if (existenta?.status === "RESPINS") throw new ActionError("Organizatorul a ales deja alți jucători.");
  if (existenta) return serializeaza(anunt, userId);
  if (anunt.jucatori.filter((j) => j.status === "ACCEPTAT").length >= anunt.jucatoriNecesari) {
    throw new ActionError("Echipa e deja completă.");
  }
  const pozitii = (date.pozitii ?? []).filter((p) => POZITII[anunt.sport].includes(p));

  await prisma.jucatorMeci.create({
    data: { anuntId, userId, telefon: verificat.data, pozitii, nivel, status: "CERERE" },
  });
  anuntaPeTelefon(anunt.autorId, {
    titlu: "Cerere nouă pentru meci",
    text: `${user?.name ?? "Cineva"}${pozitii.length ? ` (${pozitii.join(", ")})` : ""} vrea să vină la meciul din ${ziSiOra(anunt.inceput)}`,
  });
  const actual = await prisma.anuntMeci.findUniqueOrThrow({ where: { id: anuntId }, include: includeMeci });
  return serializeaza(actual, userId);
}

/** Organizatorul acceptă sau refuză o cerere. Acceptă doar cât mai are locuri. */
export async function raspundeCerere(anuntId: string, organizatorId: string, jucatorId: string, accepta: boolean) {
  await prisma.$transaction(async (tx) => {
    // Blocăm anunțul cât numărăm, ca două acceptări simultane să nu treacă de limită.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${anuntId}))`;
    const anunt = await tx.anuntMeci.findUnique({
      where: { id: anuntId },
      select: { autorId: true, jucatoriNecesari: true, inceput: true, jucatori: { select: { userId: true, status: true } } },
    });
    if (!anunt || anunt.autorId !== organizatorId) throw new ActionError("Doar organizatorul poate alege jucătorii.");
    if (!anunt.jucatori.some((j) => j.userId === jucatorId)) throw new ActionError("Cererea nu mai există.");
    if (accepta && anunt.jucatori.filter((j) => j.status === "ACCEPTAT").length >= anunt.jucatoriNecesari) {
      throw new ActionError("Ai deja toți jucătorii de care aveai nevoie.");
    }
    await tx.jucatorMeci.update({
      where: { anuntId_userId: { anuntId, userId: jucatorId } },
      data: { status: accepta ? "ACCEPTAT" : "RESPINS" },
    });
    anuntaPeTelefon(jucatorId, accepta
      ? { titlu: "Ai fost acceptat la meci!", text: `Te așteaptă la meciul din ${ziSiOra(anunt.inceput)}` }
      : { titlu: "Cererea ta n-a fost acceptată", text: `Organizatorul a ales alți jucători pentru meciul din ${ziSiOra(anunt.inceput)}` });
  });
}

function ziSiOra(d: Date) {
  return d.toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Notificarea pleacă după răspuns, ca să nu întârzie acțiunea. */
function anuntaPeTelefon(userId: string, n: { titlu: string; text: string }) {
  after(() => trimiteNotificare(userId, { ...n, date: { ecran: "meciuri" } }));
}

export async function parasesteMeci(anuntId: string, userId: string) {
  const sters = await prisma.jucatorMeci.deleteMany({ where: { anuntId, userId } });
  if (sters.count === 0) return;
  const [anunt, user] = await Promise.all([
    prisma.anuntMeci.findUnique({ where: { id: anuntId }, select: { autorId: true, inceput: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  if (anunt) {
    anuntaPeTelefon(anunt.autorId, {
      titlu: "Un jucător s-a retras",
      text: `${user?.name ?? "Cineva"} nu mai vine la meciul din ${ziSiOra(anunt.inceput)}`,
    });
  }
}

export async function stergeMeci(anuntId: string, userId: string) {
  const anunt = await prisma.anuntMeci.findUnique({ where: { id: anuntId }, select: { autorId: true } });
  if (!anunt || anunt.autorId !== userId) throw new ActionError("Doar organizatorul poate șterge anunțul.");
  const detalii = await prisma.anuntMeci.findUnique({
    where: { id: anuntId },
    select: { inceput: true, jucatori: { select: { userId: true } } },
  });
  await prisma.anuntMeci.delete({ where: { id: anuntId } });
  for (const j of detalii?.jucatori ?? []) {
    anuntaPeTelefon(j.userId, {
      titlu: "Meci anulat",
      text: `Organizatorul a anulat meciul din ${ziSiOra(detalii!.inceput)}`,
    });
  }
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

/** Organizatorul scoate un jucător din meci; locul se eliberează pentru altcineva. */
export async function scoateJucator(anuntId: string, organizatorId: string, jucatorId: string) {
  const anunt = await prisma.anuntMeci.findUnique({ where: { id: anuntId }, select: { autorId: true, inceput: true } });
  if (!anunt || anunt.autorId !== organizatorId) throw new ActionError("Doar organizatorul poate scoate jucători.");
  const sters = await prisma.jucatorMeci.deleteMany({ where: { anuntId, userId: jucatorId } });
  if (sters.count > 0) {
    anuntaPeTelefon(jucatorId, {
      titlu: "Ai fost scos din meci",
      text: `Organizatorul te-a scos din meciul din ${ziSiOra(anunt.inceput)}`,
    });
  }
}

/** Telefonul dat în formular sau, dacă lipsește, cel din cont. Fără el nu merge. */
export async function telefonObligatoriu(userId: string, dat: string | null | undefined, lipsa: string): Promise<string> {
  const user = dat?.trim() ? null : await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  const text = dat?.trim() || user?.phone?.trim() || "";
  const verificat = phoneSchema.safeParse(text);
  if (!verificat.success) throw new ActionError(text ? "Numărul de telefon nu pare valid." : lipsa);
  return verificat.data;
}
