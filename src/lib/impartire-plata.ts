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
  stare: "STRANGE" | "COMPLETA" | "ESUATA" | "ANULATA";
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
    // Rezervarea fusese deja anulată sau refuzată: închidem împărțirea fără mesajul
    // „nu s-au strâns banii”, dar cine aștepta ora tot află.
    if (STARI_INCHISE.has(i.booking.status)) {
      const inchisa = await prisma.impartirePlata.updateMany({ where: { id: i.id, stare: "STRANGE" }, data: { stare: "ANULATA" } });
      if (inchisa.count > 0) await anuntaOraLibera(i.booking, []);
      continue;
    }
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
    await anuntaOraLibera(b, i.parti.map((p) => p.userId));

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

/**
 * Cine a cerut „Anunță-mă” pentru o oră care tocmai s-a eliberat primește
 * „Terenul e disponibil!”. O singură dată pe alertă.
 */
async function anuntaOraLibera(
  b: { fieldId: string; startTime: Date; endTime: Date; field: { name: string } },
  exclusi: (string | null)[]
) {
  const alerte = await prisma.alertaTeren.findMany({
    where: { fieldId: b.fieldId, notificatLa: null, startTime: { lt: b.endTime }, endTime: { gt: b.startTime } },
    select: { id: true, userId: true },
  });
  if (!alerte.length) return;
  const marcate = await prisma.alertaTeren.updateMany({
    where: { id: { in: alerte.map((a) => a.id) }, notificatLa: null },
    data: { notificatLa: new Date() },
  });
  if (marcate.count === 0) return;
  const cand = ziSiOra(b.startTime);
  await Promise.all(
    alerte
      .filter((a) => !exclusi.includes(a.userId))
      .map((a) =>
        trimiteNotificare(a.userId, {
          titlu: "Terenul e disponibil!",
          text: `${b.field.name} s-a eliberat: ${cand}. Rezervă acum, înainte să-l ia altcineva.`,
          date: { ecran: "teren", terenId: b.fieldId },
        })
      )
  );
}

/**
 * O rezervare a fost anulată sau refuzată: dacă avea split the bill care strângea
 * banii, se închide și prietenii care au plătit află; cine aștepta ora e anunțat.
 * Se cheamă din `anuntaRezervare`, deci prinde toate drumurile de anulare.
 */
export async function elibereazaOra(bookingId: string, motiv: "anulata" | "respinsa"): Promise<void> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      fieldId: true,
      startTime: true,
      endTime: true,
      customerId: true,
      customer: { select: { name: true } },
      field: { select: { name: true } },
      impartire: { select: { id: true, stare: true, parti: { select: { userId: true, esteOrganizator: true } } } },
    },
  });
  if (!b) return;

  const notificari: Promise<void>[] = [];
  if (b.impartire?.stare === "STRANGE") {
    const schimbat = await prisma.impartirePlata.updateMany({
      where: { id: b.impartire.id, stare: "STRANGE" },
      data: { stare: "ANULATA" },
    });
    if (schimbat.count > 0) {
      const cand = ziSiOra(b.startTime);
      const text =
        motiv === "anulata"
          ? `${b.customer?.name ?? "Organizatorul"} a anulat rezervarea de la ${b.field.name}, ${cand}. Partea ta se întoarce.`
          : `Terenul ${b.field.name} a refuzat rezervarea din ${cand}. Partea ta se întoarce.`;
      // Organizatorul află deja din anunțul rezervării; prietenii care au plătit, de aici.
      for (const p of b.impartire.parti.filter((x) => !x.esteOrganizator)) {
        notificari.push(trimiteNotificare(p.userId, { titlu: "Meciul a fost anulat", text, date: { ecran: "rezervari" } }));
      }
    }
  }
  notificari.push(anuntaOraLibera(b, [b.customerId]));
  await Promise.all(notificari);
}
