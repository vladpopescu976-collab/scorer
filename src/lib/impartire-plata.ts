import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/actions/result";
import { normalizeazaOras } from "@/lib/orase";
import { trimiteNotificare } from "@/lib/push";
import { urlAplicatie } from "@/lib/email";
import { MAX_PARTI, MIN_PARTI, ORE_MINIME_SPLIT, calculeazaPartile, oreDeStrans, textOre } from "@/lib/impartire-calcul";

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
  /** Până când se pot strânge banii. */
  termen: string;
  stare: "STRANGE" | "COMPLETA" | "ESUATA";
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
  const inchisa = STARI_INCHISE.has(i.booking.status) || i.stare === "ESUATA";
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
      !amPlatit && !inchisa && i.stare === "STRANGE" && parti.length < i.numarParti && i.termen.getTime() > Date.now(),
    inchisa,
    termen: i.termen.toISOString(),
    stare: i.stare as ImpartireApi["stare"],
  };
}

/** Organizatorul împarte nota: își plătește partea pe loc, restul vin din link. */
export async function pornesteImpartirea(bookingId: string, userId: string, numarParti: number): Promise<ImpartireApi> {
  if (!Number.isInteger(numarParti) || numarParti < MIN_PARTI || numarParti > MAX_PARTI) {
    throw new ActionError(`Nota se împarte între ${MIN_PARTI} și ${MAX_PARTI} persoane.`);
  }
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { customerId: true, status: true, totalPrice: true, startTime: true, impartire: { select: { cod: true } } },
  });
  if (!booking || booking.customerId !== userId) throw new ActionError("Rezervarea nu e a ta.");
  if (STARI_INCHISE.has(booking.status)) throw new ActionError("Rezervarea nu mai e activă.");
  if (booking.impartire) return (await impartirePublica(booking.impartire.cod, userId))!;

  const oreInainte = (booking.startTime.getTime() - Date.now()) / 3_600_000;
  const ore = oreDeStrans(oreInainte);
  if (ore === null) {
    throw new ActionError(`Split the bill merge doar dacă rezervi cu cel puțin ${ORE_MINIME_SPLIT} ore înainte.`);
  }
  const total = Number(booking.totalPrice);
  const { sumaParte, parteaOrganizatorului } = calculeazaPartile(total, numarParti);
  const creata = await prisma.impartirePlata.create({
    data: {
      bookingId,
      organizatorId: userId,
      cod: randomBytes(9).toString("base64url"),
      numarParti,
      sumaParte,
      termen: new Date(Date.now() + ore * 3_600_000),
      parti: { create: { userId, suma: parteaOrganizatorului, esteOrganizator: true } },
    },
    include,
  });
  return serializeaza(creata, userId);
}

export async function impartirePublica(cod: string, vizitatorId: string | null): Promise<ImpartireApi | null> {
  await expiraImpartirile();
  const i = await prisma.impartirePlata.findUnique({ where: { cod }, include });
  return i ? serializeaza(i, vizitatorId) : null;
}

/** Un prieten își plătește partea din link. */
export async function platesteParte(cod: string, userId: string): Promise<ImpartireApi> {
  await expiraImpartirile();
  const rezultat = await prisma.$transaction(async (tx) => {
    const i = await tx.impartirePlata.findUnique({ where: { cod }, include });
    if (!i) throw new ActionError("Linkul nu mai e valabil.");
    // Același lock pe împărțire: doi prieteni care plătesc deodată nu pot lua ultimul loc amândoi.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${i.id}))`;
    const actual = await tx.impartirePlata.findUniqueOrThrow({ where: { id: i.id }, include });
    const date = serializeaza(actual, userId);
    if (date.amPlatit) return { date, nou: null };
    if (date.inchisa) throw new ActionError("Rezervarea a fost anulată. Nu mai e nimic de plătit.");
    if (actual.termen.getTime() <= Date.now()) throw new ActionError("Timpul pentru strâns banii s-a terminat.");
    if (date.platite >= actual.numarParti) throw new ActionError("Toate părțile au fost deja plătite.");
    await tx.parteImpartire.create({ data: { impartireId: actual.id, userId, suma: actual.sumaParte } });
    // Ultima parte: nota e plătită integral și rezervarea rămâne.
    if (date.platite + 1 >= actual.numarParti) {
      await tx.impartirePlata.update({ where: { id: actual.id }, data: { stare: "COMPLETA" } });
    }
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

/**
 * Împărțirile al căror termen a trecut fără să se strângă toți banii: rezervarea
 * se anulează, ora se eliberează, cei care au plătit și proprietarul află, iar
 * cine a cerut „Anunță-mă” primește notificare că terenul e liber.
 *
 * Se cheamă la citiri (disponibilitate, liste, notificări), ca restul expirărilor:
 * proiectul n-are sarcini programate.
 */
export async function expiraImpartirile(): Promise<number> {
  const expirate = await prisma.impartirePlata.findMany({
    where: { stare: "STRANGE", termen: { lte: new Date() } },
    include: {
      parti: { select: { userId: true } },
      booking: { select: { id: true, status: true, startTime: true, endTime: true, fieldId: true, field: { select: { name: true, ownerId: true } } } },
    },
    take: 50,
  });

  let anulate = 0;
  for (const i of expirate) {
    const ok = await prisma.$transaction(async (tx) => {
      // Doar cine schimbă starea primul trimite notificările: fără dubluri.
      const schimbat = await tx.impartirePlata.updateMany({
        where: { id: i.id, stare: "STRANGE" },
        data: { stare: i.parti.length >= i.numarParti ? "COMPLETA" : "ESUATA" },
      });
      if (schimbat.count === 0 || i.parti.length >= i.numarParti) return false;
      await tx.booking.updateMany({
        where: { id: i.booking.id, status: { in: ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"] } },
        data: { status: "CANCELLED" },
      });
      return true;
    });
    if (!ok) continue;
    anulate++;

    const b = i.booking;
    const cand = ziSiOra(b.startTime);
    const alerte = await prisma.alertaTeren.findMany({
      where: { fieldId: b.fieldId, notificatLa: null, startTime: { lt: b.endTime }, endTime: { gt: b.startTime } },
      select: { id: true, userId: true },
    });
    if (alerte.length) {
      await prisma.alertaTeren.updateMany({ where: { id: { in: alerte.map((a) => a.id) } }, data: { notificatLa: new Date() } });
    }

    after(() =>
      Promise.all([
        // Cei care au plătit (organizatorul primul): banii se întorc.
        ...i.parti.map((p) =>
          trimiteNotificare(p.userId, {
            titlu: "Nu s-au strâns banii la timp",
            text: `Rezervarea de la ${b.field.name}, ${cand}, a fost anulată. Partea plătită se întoarce.`,
            date: { ecran: "rezervari" },
          })
        ),
        trimiteNotificare(b.field.ownerId, {
          titlu: "Rezervare anulată: split the bill neplătit",
          text: `${b.field.name}, ${cand}. Ora e din nou liberă.`,
          date: { ecran: "rezervari" },
        }),
        // Cine aștepta ora primește vestea că s-a eliberat.
        ...alerte
          .filter((a) => !i.parti.some((p) => p.userId === a.userId))
          .map((a) =>
            trimiteNotificare(a.userId, {
              titlu: "Terenul e disponibil!",
              text: `${b.field.name} s-a eliberat: ${cand}. Rezervă acum, înainte să-l ia altcineva.`,
              date: { ecran: "teren", terenId: b.fieldId },
            })
          ),
      ])
    );
  }
  return anulate;
}

/** Intervalele ținute de un split the bill care încă strânge banii, pentru „posibil disponibil”. */
export async function intervalePosibile(fieldId: string, de: Date, pana: Date) {
  const lista = await prisma.impartirePlata.findMany({
    where: {
      stare: "STRANGE",
      termen: { gt: new Date() },
      booking: { fieldId, status: { in: ["PENDING", "CONFIRMED"] }, startTime: { lt: pana }, endTime: { gt: de } },
    },
    select: { termen: true, booking: { select: { startTime: true, endTime: true } } },
  });
  return lista.map((i) => ({ start: i.booking.startTime, end: i.booking.endTime, termen: i.termen }));
}

/** „Anunță-mă dacă se eliberează” pentru o oră ținută de un split the bill. */
export async function cereAlerta(userId: string, fieldId: string, start: Date, end: Date) {
  if (end <= start || start.getTime() <= Date.now()) throw new ActionError("Intervalul nu e valid.");
  await prisma.alertaTeren.upsert({
    where: { userId_fieldId_startTime: { userId, fieldId, startTime: start } },
    create: { userId, fieldId, startTime: start, endTime: end },
    update: { endTime: end, notificatLa: null },
  });
}

export { textOre };
