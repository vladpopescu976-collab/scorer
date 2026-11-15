import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { seteazaInvitatii, stergeAnuntJucator } from "@/lib/jucatori-liberi";

export const maxDuration = 60;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await stergeAnuntJucator((await params).id, sesiune.userId);
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("sterge-anunt-jucator", error);
  }
}

/** Jucătorul pornește sau oprește invitațiile: { primesteInvitatii: boolean }. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const { primesteInvitatii } = z.object({ primesteInvitatii: z.boolean() }).parse(await request.json());
    await seteazaInvitatii((await params).id, sesiune.userId, primesteInvitatii);
    return raspuns({ primesteInvitatii });
  } catch (error) {
    return eroareNeasteptata("invitatii-jucator", error);
  }
}
