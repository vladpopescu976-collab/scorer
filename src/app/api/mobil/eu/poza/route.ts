import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { primulFisier, salveazaPozaProfil, stergePozaProfil } from "@/lib/poza-profil";

export const maxDuration = 60;

/** Poza de profil, aleasă din telefon. Înlocuiește poza veche. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const rezultat = await salveazaPozaProfil(sesiune.userId, primulFisier(await request.formData()));
    if (!rezultat.ok) return eroare(rezultat.mesaj, rezultat.cod);
    return raspuns({ poze: [rezultat.adresa] }, 201);
  } catch (error) {
    return eroareNeasteptata("poza-profil", error);
  }
}

/** Scoate poza de profil; rămân inițialele. */
export async function DELETE(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    await stergePozaProfil(sesiune.userId);
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("sterge-poza-profil", error);
  }
}
