import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { noteazaJucator } from "@/lib/note-jucatori";

export const maxDuration = 60;

/** Nota de după meci: { destinatarId, nota (1–5), comentariu? }. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await noteazaJucator((await params).id, sesiune.userId, await request.json());
    return raspuns({ notat: true });
  } catch (error) {
    return eroareNeasteptata("noteaza-jucator", error);
  }
}
