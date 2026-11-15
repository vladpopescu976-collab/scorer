import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { raspundeCerere } from "@/lib/meciuri";

export const maxDuration = 60;

/** Organizatorul acceptă sau refuză o cerere: { accepta: boolean }. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; jucatorId: string }> }
) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const { accepta } = z.object({ accepta: z.boolean() }).parse(await request.json());
    const { id, jucatorId } = await params;
    await raspundeCerere(id, sesiune.userId, jucatorId, accepta);
    return raspuns({ accepta });
  } catch (error) {
    return eroareNeasteptata("raspunde-cerere", error);
  }
}
