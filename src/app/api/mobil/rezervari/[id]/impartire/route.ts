import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { pornesteImpartirea } from "@/lib/impartire-plata";

export const maxDuration = 60;

/** Split the bill: organizatorul împarte nota rezervării în { parti } persoane. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const corp = z.object({ parti: z.number().int() }).parse(await request.json());
    return raspuns(await pornesteImpartirea((await params).id, sesiune.userId, corp.parti), 201);
  } catch (error) {
    return eroareNeasteptata("porneste-impartirea", error);
  }
}
