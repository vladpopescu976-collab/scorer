import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { stergeMeci } from "@/lib/meciuri";

export const maxDuration = 60;

/** Organizatorul își retrage anunțul. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await stergeMeci((await params).id, sesiune.userId);
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("sterge-meci", error);
  }
}
