import { cerePersonal, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { meciuriDeEvaluat } from "@/lib/note-jucatori";

export const maxDuration = 60;

/** Meciurile jucate în care ai pe cine nota. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    return raspuns(await meciuriDeEvaluat(sesiune.userId));
  } catch (error) {
    return eroareNeasteptata("meciuri-de-evaluat", error);
  }
}
