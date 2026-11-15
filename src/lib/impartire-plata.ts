import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { normalizeazaOras } from "@/lib/orase";
import { trimiteNotificare } from "@/lib/push";
import { urlAplicatie } from "@/lib/email";
import { MAX_PARTI, MIN_PARTI, calculeazaPartile } from "@/lib/impartire-calcul";

/**
 * Split the bill. Organizatorul rezervă, alege în câți se împarte nota și
 * își plătește partea. Ceilalți primesc un link și își plătesc fiecare partea
 * lui. Plata e demonstrativă, ca restul plăților: nu se debitează nimic.
 */

export type ParteApi = {
  id: string;
  nume: string;
  poza: string | null;
  suma: number;
  esteOrganizator: boolean;
  platitLa: string;
  /** Ești tu. */
  eu: boolean;
};

export type ImpartireApi = {
  cod: string;
  link: string;
  rezervareId: string;
  teren: { nume: string; oras: string; sport: string };
  inceput: string;
  sfarsit: string;
  total: number;
  numarParti: number;
  sumaParte: number;
  /** Ce a plătit deja fiecare, organizatorul primul. */
  parti: ParteApi[];
  platite: number;
  colectat: number;
  ramas: number;
  esteOrganizator: boolean;
  amPlatit: boolean;
  /** Mai poți plăti: nu ai plătit, mai sunt locuri, rezervarea e în picioare și n-a început. */
  potPlati: boolean;
  /** Rezervarea a fost anulată sau refuzată: nu se mai plătește nimic. */
  inchisa: boolean;
};

const include = {
  booking: {
    select: {
      id: true,
      status: true,
      startTime: true,
      endTime: true,
      totalPrice: true,
      field: { select: { name: true, city: true, sportType: true } },
    },
  },
  parti: {
    orderBy: [{ esteOrganizator: "desc" }, { platitLa: "asc" }],
    include: { user: { select: { id: true, name: true, image: true } } },
  },
} satisfies Prisma.ImpartirePlataInclude;

type ImpartireCuDetalii = Prisma.ImpartirePlataGetPayload<{ include: typeof include }>;

const STARI_INCHISE = new Set(["CANCELLED", "REJECTED", "EXPIRED"]);

function serializeaza(i: ImpartireCuDetalii, vizitatorId: string | null): ImpartireApi {
  const parti = i.parti.map((p) => ({
    id: p.id,
    nume: p.user.name,
    poza: p.user.image,
    suma: Number(p.suma),
    esteOrganizator: p.esteOrganizator,
    platitLa: p.platitLa.toISOString(),
    eu: p.user.id === vizitatorId,
  }));
  const total = Number(i.booking.totalPrice);
  const colectat = Math.round(parti.reduce((s, p) => s + p.suma, 0) * 100) / 100;
  const inchisa = STARI_INCHISE.has(i.booking.status);
  const amPlatit = parti.some((p) => p.eu);
  return {
    cod: i.cod,
    link: `${urlAplicatie()}/imparte/${i.cod}`,
    rezervareId: i.booking.id,
    teren: { nume: i.booking.field.name, oras: normalizeazaOras(i.booking.field.city), sport: i.booking.field.sportType },
    inceput: i.booking.startTime.toISOString(),
    sfarsit: i.booking.endTime.toISOString(),
    total,
    numarParti: i.numarParti,
    sumaParte: Number(i.sumaParte),
    parti,
    platite: parti.length,
    colectat,
    ramas: Math.max(0, Math.round((total - colectat) * 100) / 100),
    esteOrganizator: i.organizatorId === vizitatorId,
    amPlatit,
    potPlati:
      !amPlatit && !inchisa && parti.length < i.numarParti && i.booking.startTime.getTime() > Date.now(),
    inchisa,
  };
}

/** Organizatorul împarte nota: își plătește partea pe loc, restul vin din link. */
export async function pornesteImpartirea(bookingId: string, userId: string, numarParti: number): Promise<ImpartireApi> {
  if (!Number.isInteger(numarParti) || numarParti < MIN_PARTI || numarParti > MAX_PARTI) {
    throw new ActionError(`Nota se împarte între ${MIN_PARTI} și ${MAX_PARTI} persoane.`);
  }
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { customerId: true, status: true, totalPrice: true, impartire: { select: { cod: true } } },
  });
  if (!booking || booking.customerId !== userId) throw new ActionError("Rezervarea nu e a ta.");
  if (STARI_INCHISE.has(booking.status)) throw new ActionError("Rezervarea nu mai e activă.");
  if (booking.impartire) return (await impartirePublica(booking.impartire.cod, userId))!;

  const total = Number(booking.totalPrice);
  const { sumaParte, parteaOrganizatorului } = calculeazaPartile(total, numarParti);
  const creata = await prisma.impartirePlata.create({
    data: {
      bookingId,
      organizatorId: userId,
      cod: randomBytes(9).toString("base64url"),
      numarParti,
      sumaParte,
      parti: { create: { userId, suma: parteaOrganizatorului, esteOrganizator: true } },
    },
    include,
  });
  return serializeaza(creata, userId);
}

export async function impartirePublica(cod: string, vizitatorId: string | null): Promise<ImpartireApi | null> {
  const i = await prisma.impartirePlata.findUnique({ where: { cod }, include });
  return i ? serializeaza(i, vizitatorId) : null;
}

/** Un prieten își plătește partea din link. */
export async function platesteParte(cod: string, userId: string): Promise<ImpartireApi> {
  const rezultat = await prisma.$transaction(async (tx) => {
    const i = await tx.impartirePlata.findUnique({ where: { cod }, include });
    if (!i) throw new ActionError("Linkul nu mai e valabil.");
    // Același lock pe împărțire: doi prieteni care plătesc deodată nu pot lua ultimul loc amândoi.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${i.id}))`;
    const actual = await tx.impartirePlata.findUniqueOrThrow({ where: { id: i.id }, include });
    const date = serializeaza(actual, userId);
    if (date.amPlatit) return { date, nou: null };
    if (date.inchisa) throw new ActionError("Rezervarea a fost anulată. Nu mai e nimic de plătit.");
    if (actual.booking.startTime.getTime() <= Date.now()) throw new ActionError("Meciul a început deja.");
    if (date.platite >= actual.numarParti) throw new ActionError("Toate părțile au fost deja plătite.");
    await tx.parteImpartire.create({ data: { impartireId: actual.id, userId, suma: actual.sumaParte } });
    const dupa = await tx.impartirePlata.findUniqueOrThrow({ where: { id: actual.id }, include });
    return { date: serializeaza(dupa, userId), nou: dupa };
  });

  if (rezultat.nou) {
    const i = rezultat.nou;
    const platitor = i.parti.find((p) => p.userId === userId);
    const complet = i.parti.length >= i.numarParti;
    after(() =>
      trimiteNotificare(i.organizatorId, {
        titlu: complet ? "Toată lumea și-a plătit partea" : `${platitor?.user.name ?? "Cineva"} și-a plătit partea`,
        text: `${i.booking.field.name} · ${i.parti.length}/${i.numarParti} au plătit · ${rezultat.date.colectat} din ${rezultat.date.total} RON`,
        date: { ecran: "rezervari" },
      })
    );
  }
  return rezultat.date;
}
