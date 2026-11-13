import { z } from "zod";

import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { inregistreazaDispozitiv, stergeDispozitiv } from "@/lib/push";

export const maxDuration = 60;

const schema = z.object({ token: z.string().regex(/^[0-9a-fA-F]{32,200}$/, "Token invalid.") });

/** Telefonul își trimite tokenul de notificări după ce utilizatorul le permite. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    const { token } = schema.parse(await request.json());
    await inregistreazaDispozitiv(sesiune.userId, token);
    return raspuns({ inregistrat: true });
  } catch (error) {
    return eroareNeasteptata("dispozitiv-push", error);
  }
}

/** La deconectare: telefonul nu mai primește notificările contului. */
export async function DELETE(request: Request) {
  try {
    const { token } = schema.parse(await request.json());
    await stergeDispozitiv(token);
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("sterge-dispozitiv-push", error);
  }
}
