import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { scoateJucator } from "@/lib/meciuri";

export const maxDuration = 60;

/** Organizatorul scoate un jucător din meci. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; jucatorId: string }> }
) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    const { id, jucatorId } = await params;
    await scoateJucator(id, sesiune.userId, jucatorId);
    return raspuns({ scos: true });
  } catch (error) {
    return eroareNeasteptata("scoate-jucator", error);
  }
}
