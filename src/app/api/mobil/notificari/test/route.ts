import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { pushConfigurat, trimiteNotificare } from "@/lib/push";

export const maxDuration = 60;

/**
 * Trimite o notificare de test pe telefoanele contului și spune ce lipsește,
 * dacă lipsește ceva: cheia Apple pe server sau telefonul înregistrat.
 */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const telefoane = await prisma.dispozitivPush.count({ where: { userId: sesiune.userId } }).catch(() => -1);
    await trimiteNotificare(sesiune.userId, {
      titlu: "Notificare de test",
      text: "Dacă vezi asta cu aplicația închisă, notificările merg.",
      date: { ecran: "rezervari" },
    });

    return raspuns({
      cheieApple: pushConfigurat,
      telefoaneInregistrate: Math.max(0, telefoane),
      tabelLipsa: telefoane === -1,
    });
  } catch (error) {
    return eroareNeasteptata("notificare-test", error);
  }
}
