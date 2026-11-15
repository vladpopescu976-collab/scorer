import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { notePrimite } from "@/lib/note-jucatori";

export const maxDuration = 60;

/** Notele primite după meciuri, pentru pagina de cont. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    return raspuns(await notePrimite(sesiune.userId));
  } catch (error) {
    return eroareNeasteptata("note-primite", error);
  }
}
