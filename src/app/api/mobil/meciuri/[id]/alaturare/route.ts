import { z } from "zod";

import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { aplicaLaMeci, parasesteMeci } from "@/lib/meciuri";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    // Cererea de a veni: telefon (obligatoriu), poziții, nivel. Organizatorul alege.
    const date = z
      .object({ telefon: z.string().optional(), pozitii: z.array(z.string()).max(6).optional(), nivel: z.string().optional() })
      .parse(await request.json().catch(() => ({})));
    return raspuns(await aplicaLaMeci((await params).id, sesiune.userId, date));
  } catch (error) {
    return eroareNeasteptata("alatura-meci", error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await parasesteMeci((await params).id, sesiune.userId);
    return raspuns({ iesit: true });
  } catch (error) {
    return eroareNeasteptata("paraseste-meci", error);
  }
}
