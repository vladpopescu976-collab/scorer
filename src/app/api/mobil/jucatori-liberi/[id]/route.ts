import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { stergeAnuntJucator } from "@/lib/jucatori-liberi";

export const maxDuration = 60;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await stergeAnuntJucator((await params).id, sesiune.userId);
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("sterge-anunt-jucator", error);
  }
}
