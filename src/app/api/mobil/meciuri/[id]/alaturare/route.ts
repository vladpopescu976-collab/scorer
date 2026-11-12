import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { alaturaMeci, parasesteMeci } from "@/lib/meciuri";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    return raspuns(await alaturaMeci((await params).id, sesiune.userId));
  } catch (error) {
    return eroareNeasteptata("alatura-meci", error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    await parasesteMeci((await params).id, sesiune.userId);
    return raspuns({ iesit: true });
  } catch (error) {
    return eroareNeasteptata("paraseste-meci", error);
  }
}
