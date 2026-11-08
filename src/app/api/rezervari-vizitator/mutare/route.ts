import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { anuntaRezervare } from "@/lib/emailuri/rezervari";
import { aTrecutOra, expiraRezervarile } from "@/lib/rezervari-expirate";
import { rezervareaDinToken } from "@/lib/rezervari-vizitator";

export const maxDuration = 60;

const schema = z.object({ token: z.string().min(1), actiune: z.enum(["accepta", "refuza"]) });

/**
 * Răspunsul vizitatorului la o oră nouă propusă de proprietar. Fără ruta asta,
 * cine rezervase fără cont nu avea cum să accepte propunerea.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });

  const rezervare = await rezervareaDinToken(parsed.data.token);
  if (!rezervare) return NextResponse.json({ error: "Rezervarea nu a fost găsită." }, { status: 404 });

  if (rezervare.status !== "RESCHEDULE_PROPOSED" || !rezervare.proposedStartTime || !rezervare.proposedEndTime) {
    return NextResponse.json({ error: "Nu există o propunere de mutare." }, { status: 409 });
  }

  if (parsed.data.actiune === "refuza") {
    await prisma.booking.update({
      where: { id: rezervare.id },
      data: { status: "REJECTED", proposedStartTime: null, proposedEndTime: null },
    });
    anuntaRezervare(rezervare.id, "mutare-refuzata");
    return NextResponse.json({ ok: true });
  }

  if (aTrecutOra(rezervare)) {
    await expiraRezervarile({ id: rezervare.id });
    return NextResponse.json({ error: "Ora propusă a trecut, așa că propunerea a expirat." }, { status: 409 });
  }

  try {
    await prisma.booking.update({
      where: { id: rezervare.id },
      data: {
        status: "CONFIRMED",
        startTime: rezervare.proposedStartTime,
        endTime: rezervare.proposedEndTime,
        proposedStartTime: null,
        proposedEndTime: null,
      },
    });
  } catch (eroare) {
    if (eroare instanceof Error && eroare.message.includes("23P01")) {
      return NextResponse.json({ error: "Ora propusă s-a ocupat între timp." }, { status: 409 });
    }
    throw eroare;
  }
  anuntaRezervare(rezervare.id, "mutare-acceptata");
  return NextResponse.json({ ok: true });
}
