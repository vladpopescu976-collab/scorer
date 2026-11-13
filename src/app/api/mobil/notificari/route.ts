import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/**
 * Notificările contului, cele mai noi primele. Cu `dupa` (dată ISO), doar
 * cele mai noi decât ea: aplicația le arată pe telefon pe cele pe care nu
 * le-a arătat încă.
 */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const dupa = new URL(request.url).searchParams.get("dupa");
    const data = dupa ? new Date(dupa) : null;

    const [notificari, necitite] = await Promise.all([
      prisma.notificare.findMany({
        where: { userId: sesiune.userId, ...(data && !isNaN(+data) ? { createdAt: { gt: data } } : {}) },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notificare.count({ where: { userId: sesiune.userId, citita: false } }),
    ]);

    return raspuns({
      necitite,
      notificari: notificari.map((n) => ({
        id: n.id,
        titlu: n.titlu,
        text: n.text,
        ecran: n.ecran,
        citita: n.citita,
        creataLa: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return eroareNeasteptata("notificari", error);
  }
}
