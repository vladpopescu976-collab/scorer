import { z } from "zod";

import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { rezervareaDinToken } from "@/lib/rezervari-vizitator";

export const maxDuration = 60;

/**
 * Rezervarea făcută fără cont, citită din linkul primit pe email. Aplicația
 * ține tokenul pe telefon, ca vizitatorul să își vadă rezervarea fără cont.
 * Anularea și răspunsul la o mutare folosesc rutele publice de pe site.
 */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const { data: curat } = z.string().trim().min(10).max(200).safeParse(token);
    if (!curat) return eroare("Link invalid.", 400);

    const r = await rezervareaDinToken(curat);
    if (!r) return eroare("Rezervarea nu a fost găsită. Verifică linkul.", 404);

    return raspuns({
      id: r.id,
      status: r.status,
      inceput: r.startTime.toISOString(),
      sfarsit: r.endTime.toISOString(),
      inceputPropus: r.proposedStartTime?.toISOString() ?? null,
      sfarsitPropus: r.proposedEndTime?.toISOString() ?? null,
      pret: Number(r.totalPrice),
      nume: r.guestName,
      teren: {
        nume: r.field.name,
        oras: r.field.city,
        adresa: r.field.address,
        telefon: r.field.contactPhone,
      },
    });
  } catch (error) {
    return eroareNeasteptata("mobil-rezervare-vizitator", error);
  }
}
