import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { anuntaRezervare } from "@/lib/emailuri/rezervari";
import { rezervareaDinToken } from "@/lib/rezervari-vizitator";

export const maxDuration = 60;

/** Anularea unei rezervări făcute fără cont. Tokenul din link ține loc de parolă. */
export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Link invalid." }, { status: 400 });

  const rezervare = await rezervareaDinToken(parsed.data.token);
  if (!rezervare) return NextResponse.json({ error: "Rezervarea nu a fost găsită." }, { status: 404 });

  if (rezervare.status === "CANCELLED") {
    return NextResponse.json({ error: "Rezervarea este deja anulată." }, { status: 409 });
  }
  if (rezervare.status === "REJECTED") {
    return NextResponse.json({ error: "Rezervarea a fost deja respinsă." }, { status: 409 });
  }
  if (rezervare.endTime < new Date()) {
    return NextResponse.json({ error: "Nu poți anula o rezervare încheiată." }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: rezervare.id },
    data: { status: "CANCELLED", proposedStartTime: null, proposedEndTime: null },
  });

  anuntaRezervare(rezervare.id, "anulata-de-client");
  return NextResponse.json({ anulat: true });
}
