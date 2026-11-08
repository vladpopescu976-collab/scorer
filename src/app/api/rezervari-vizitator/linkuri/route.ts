import { after, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { trimiteEmail } from "@/lib/email";
import { sablon } from "@/lib/emailuri/sablon";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { inregistreazaEsec, ipDinCerere, verificaLimitarea } from "@/lib/limitare";
import { linkRezervare, tokenSemnat } from "@/lib/rezervari-vizitator";

export const maxDuration = 60;

const format = new Intl.DateTimeFormat("ro-RO", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Retrimite linkurile rezervărilor făcute fără cont, pentru cine a pierdut
 * emailul. Răspunsul e același oricum, ca să nu se poată afla ce adrese au
 * rezervări; linkurile pleacă doar pe adresa de pe rezervare.
 */
export async function POST(request: Request) {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Adresă de email invalidă.") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Cerere invalidă." }, { status: 400 });
  }

  const ip = ipDinCerere(request);
  const limita = await verificaLimitarea("linkuri-vizitator", ip);
  if (!limita.permis) return NextResponse.json({ error: limita.mesaj }, { status: 429 });
  await inregistreazaEsec("linkuri-vizitator", ip);

  const email = parsed.data.email;
  after(async () => {
    try {
      const rezervari = await prisma.booking.findMany({
        where: {
          customerId: null,
          guestEmail: { equals: email, mode: "insensitive" },
          endTime: { gt: new Date(Date.now() - 30 * 86_400_000) },
        },
        include: { field: { select: { name: true } } },
        orderBy: { startTime: "asc" },
        take: 5,
      });
      for (const rezervare of rezervari) {
        const { html, text } = sablon({
          titlu: "Linkul rezervării tale",
          salut: rezervare.guestName ?? undefined,
          paragrafe: ["Ai cerut din nou linkul rezervării făcute fără cont. Îl poți deschide oricând, de pe orice dispozitiv."],
          randuri: [
            { eticheta: "Teren", valoare: rezervare.field.name },
            { eticheta: "Când", valoare: format.format(rezervare.startTime) },
          ],
          actiune: { text: "Vezi rezervarea", link: linkRezervare(tokenSemnat(rezervare.id)) },
        });
        await trimiteEmail({ catre: email, subiect: `Rezervarea ta la ${rezervare.field.name}`, html, text });
      }
    } catch (eroare) {
      console.error("[linkuri-vizitator]", eroare);
    }
  });

  return NextResponse.json({ ok: true });
}
