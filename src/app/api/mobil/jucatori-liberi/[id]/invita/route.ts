import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { invitaJucator, invitatieSchema } from "@/lib/jucatori-liberi";

export const maxDuration = 60;

/** O echipă îl invită pe jucător: { teren, dataOra, durata?, pret?, mesaj? }. El primește o notificare. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const corp = invitatieSchema.parse(await request.json().catch(() => ({})));
    return raspuns(await invitaJucator((await params).id, sesiune.userId, corp));
  } catch (error) {
    return eroareNeasteptata("invita-jucator", error);
  }
}
