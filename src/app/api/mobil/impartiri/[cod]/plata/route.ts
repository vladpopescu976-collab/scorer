import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { platesteParte } from "@/lib/impartire-plata";

export const maxDuration = 60;

/** Un prieten își plătește partea (demonstrativ: nu se debitează nimic). */
export async function POST(request: Request, { params }: { params: Promise<{ cod: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    return raspuns(await platesteParte((await params).cod, sesiune.userId));
  } catch (error) {
    return eroareNeasteptata("plateste-parte", error);
  }
}
