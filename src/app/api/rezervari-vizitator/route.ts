import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { outsideOpeningHours } from "@/lib/availability";
import { anuntaRezervare } from "@/lib/emailuri/rezervari";
import { statusLaCreare } from "@/lib/confirmare-automata";
import { calculeazaPretul } from "@/lib/pret-rezervare";
import { linieDeSalvat, optiuneDinTeren } from "@/lib/optiuni-teren";
import { amprentaToken, linkRezervare, tokenNou } from "@/lib/rezervari-vizitator";
import { telefonSchema } from "@/lib/validations/auth";
import { inregistreazaEsec, ipDinCerere, verificaLimitarea } from "@/lib/limitare";

export const maxDuration = 60;

const schema = z.object({
  fieldId: z.string().min(1),
  startTime: z.iso.datetime({ message: "Ora de start nu este validă." }),
  endTime: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  nume: z
    .string({ message: "Scrie numele tău, ca proprietarul să știe cine vine." })
    .trim()
    .min(2, "Scrie numele tău, ca proprietarul să știe cine vine.")
    .max(100, "Numele este prea lung."),
  telefon: z
    .string({ message: "Numărul de telefon este obligatoriu." })
    .pipe(telefonSchema)
    .refine((v) => v !== "", "Numărul de telefon este obligatoriu."),
  // Fără adresă nu putem trimite confirmarea, dar linkul rămâne pe ecran.
  email: z.string().trim().email("Adresă de email invalidă.").optional().or(z.literal("")),
  optiuni: z.array(z.string()).max(20).optional().default([]),
  observatii: z.string().trim().max(600, "Observațiile nu pot depăși 600 de caractere.").optional(),
});

/**
 * Rezervare fără cont.
 *
 * Trece prin exact aceleași verificări ca una făcută dintr-un cont — teren
 * activ, interval din program, fără suprapuneri, fără blocări — fiindcă
 * altfel ar fi o portiță de ocolit regulile terenului.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide." },
      { status: 400 }
    );
  }
  const date = parsed.data;

  // Fără cont nu există nimic de limitat în afară de adresa de rețea, iar fără
  // limitare cineva poate umple orarul unui teren în câteva secunde.
  const ip = ipDinCerere(request);
  const limitare = await verificaLimitarea(`vizitator:${date.telefon}`, ip);
  if (!limitare.permis) return NextResponse.json({ error: limitare.mesaj }, { status: 429 });

  const field = await prisma.field.findUnique({
    where: { id: date.fieldId },
    include: { extras: true },
  });
  if (!field || !field.isActive) {
    return NextResponse.json({ error: "Terenul nu este disponibil pentru rezervare." }, { status: 404 });
  }

  const inceput = new Date(date.startTime);
  const sfarsit = new Date(date.endTime);
  if (sfarsit <= inceput) {
    return NextResponse.json({ error: "Ora de sfârșit trebuie să fie după ora de start." }, { status: 400 });
  }
  if (inceput < new Date()) {
    return NextResponse.json({ error: "Nu poți rezerva un interval din trecut." }, { status: 400 });
  }

  const inAfaraProgramului = outsideOpeningHours(inceput, sfarsit, field.openingHour, field.closingHour);
  if (inAfaraProgramului) return NextResponse.json({ error: inAfaraProgramului }, { status: 400 });

  // Prețul se recalculează aici, din opțiunile terenului.
  const pret = calculeazaPretul({
    pretPeOra: Number(field.pricePerHour),
    inceput,
    sfarsit,
    oras: field.city,
    optiuni: field.extras.map(optiuneDinTeren),
    alese: date.optiuni,
  });
  const status = statusLaCreare(inceput, field.autoConfirmDays);
  const token = tokenNou();

  try {
    const rezervare = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${field.id}))`;

      const suprapunere = await tx.booking.findFirst({
        where: {
          fieldId: field.id,
          status: { in: ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"] },
          startTime: { lt: sfarsit },
          endTime: { gt: inceput },
        },
      });
      if (suprapunere) throw new Error("SUPRAPUNERE");

      const blocat = await tx.blockedSlot.findFirst({
        where: { fieldId: field.id, startTime: { lt: sfarsit }, endTime: { gt: inceput } },
      });
      if (blocat) throw new Error("BLOCAT");

      return tx.booking.create({
        data: {
          fieldId: field.id,
          customerId: null,
          guestName: date.nume,
          guestPhone: date.telefon,
          guestEmail: date.email || null,
          guestTokenHash: amprentaToken(token),
          startTime: inceput,
          endTime: sfarsit,
          totalPrice: pret.total,
          notes: date.observatii?.trim() || null,
          status,
          extras: { create: pret.linii.map(linieDeSalvat) },
        },
      });
    });

    await inregistreazaEsec(`vizitator:${date.telefon}`, ip);
    if (status === "CONFIRMED") {
      anuntaRezervare(rezervare.id, "confirmata-automat");
      anuntaRezervare(rezervare.id, "aprobata");
    } else {
      anuntaRezervare(rezervare.id, "cerere-noua");
      // Altfel vizitatorul avea linkul doar pe pagina de după rezervare.
      if (rezervare.guestEmail) anuntaRezervare(rezervare.id, "cerere-trimisa");
    }

    return NextResponse.json(
      { id: rezervare.id, link: linkRezervare(token) },
      { status: 201 }
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (text.includes("BLOCAT") || text.includes("BOOKING_ON_BLOCKED_SLOT")) {
      return NextResponse.json(
        { error: "Intervalul ales este blocat de proprietarul terenului." },
        { status: 409 }
      );
    }
    if (text.includes("SUPRAPUNERE") || text.includes("23P01")) {
      return NextResponse.json(
        { error: "Intervalul ales s-a ocupat între timp. Alege altă oră." },
        { status: 409 }
      );
    }
    console.error("[api:rezervari-vizitator]", error);
    return NextResponse.json({ error: "A apărut o eroare. Încearcă din nou." }, { status: 500 });
  }
}
