import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { impartirePublica } from "@/lib/impartire-plata";

export const maxDuration = 60;

/** Cine a plătit și cât mai e de strâns. */
export async function GET(request: Request, { params }: { params: Promise<{ cod: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    const date = await impartirePublica((await params).cod, sesiune.userId);
    return date ? raspuns(date) : eroare("Linkul nu mai e valabil.", 404);
  } catch (error) {
    return eroareNeasteptata("impartire", error);
  }
}
