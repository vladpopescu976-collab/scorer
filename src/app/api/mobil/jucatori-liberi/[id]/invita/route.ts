import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { invitaJucator } from "@/lib/jucatori-liberi";

export const maxDuration = 60;

/** O echipă îl invită pe jucător; el primește o notificare. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const corp = z.object({ mesaj: z.string().max(300).optional() }).parse(await request.json().catch(() => ({})));
    return raspuns(await invitaJucator((await params).id, sesiune.userId, corp.mesaj));
  } catch (error) {
    return eroareNeasteptata("invita-jucator", error);
  }
}
