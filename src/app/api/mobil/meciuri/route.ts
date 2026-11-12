import { cerePersonal, eroareNeasteptata, raspuns, sesiuneDinCerere } from "@/lib/api/raspuns";
import { creeazaMeci, listaMeciuri } from "@/lib/meciuri";

export const maxDuration = 60;

/** Meciurile care caută jucători, filtrate după oraș și sport. Public. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sesiune = await sesiuneDinCerere(request);
    const meciuri = await listaMeciuri(
      { oras: url.searchParams.get("oras"), sport: url.searchParams.get("sport") },
      sesiune?.userId ?? null
    );
    return raspuns(meciuri);
  } catch (error) {
    return eroareNeasteptata("meciuri", error);
  }
}

/** Un anunț nou: „mai am nevoie de jucători”. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;
    return raspuns(await creeazaMeci(sesiune.userId, await request.json()), 201);
  } catch (error) {
    return eroareNeasteptata("creeaza-meci", error);
  }
}
