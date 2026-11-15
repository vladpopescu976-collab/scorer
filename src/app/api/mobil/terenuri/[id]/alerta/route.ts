import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { cereAlerta } from "@/lib/impartire-plata";

export const maxDuration = 60;

/** „Anunță-mă dacă se eliberează”: { inceput, sfarsit } pentru o oră ținută de un split the bill. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const corp = z.object({ inceput: z.iso.datetime(), sfarsit: z.iso.datetime() }).parse(await request.json());
    await cereAlerta(sesiune.userId, (await params).id, new Date(corp.inceput), new Date(corp.sfarsit));
    return raspuns({ ok: true });
  } catch (error) {
    return eroareNeasteptata("alerta-teren", error);
  }
}
