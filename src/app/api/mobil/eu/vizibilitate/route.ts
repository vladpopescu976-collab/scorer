import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { seteazaVizibilitate } from "@/lib/meciuri";

export const maxDuration = 60;

/** Dacă jucătorul apare sau nu în „Caută jucători”. */
export async function PUT(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const { vizibil } = z.object({ vizibil: z.boolean() }).parse(await request.json());
    await seteazaVizibilitate(sesiune.userId, vizibil);
    return raspuns({ vizibil });
  } catch (error) {
    return eroareNeasteptata("vizibilitate", error);
  }
}
