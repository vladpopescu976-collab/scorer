import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/** Marchează toate notificările ca citite (la deschiderea listei). */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    await prisma.notificare.updateMany({ where: { userId: sesiune.userId, citita: false }, data: { citita: true } });
    return raspuns({ citite: true });
  } catch (error) {
    return eroareNeasteptata("notificari-citite", error);
  }
}
