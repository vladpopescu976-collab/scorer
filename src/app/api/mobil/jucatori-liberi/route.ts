import { cerePersonal, eroareNeasteptata, raspuns, sesiuneDinCerere } from "@/lib/api/raspuns";
import { listaJucatoriLiberi, salveazaAnuntJucator } from "@/lib/jucatori-liberi";

export const maxDuration = 60;

/** „Caută echipă”: jucătorii care vor să joace, după oraș și sport. Public. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sesiune = await sesiuneDinCerere(request);
    return raspuns(
      await listaJucatoriLiberi(
        { oras: url.searchParams.get("oras"), sport: url.searchParams.get("sport") },
        sesiune?.userId ?? null
      )
    );
  } catch (error) {
    return eroareNeasteptata("jucatori-liberi", error);
  }
}

/** Jucătorul își pune (sau își actualizează) anunțul. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    return raspuns(await salveazaAnuntJucator(sesiune.userId, await request.json()), 201);
  } catch (error) {
    return eroareNeasteptata("salveaza-anunt-jucator", error);
  }
}
