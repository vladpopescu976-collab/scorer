import { z } from "zod";

import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { cereSchimbare, confirmaSchimbare } from "@/lib/schimbari-cont";

export const maxDuration = 60;

/** Pasul 1: parola actuală și valoarea nouă; trimite codul pe email. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    const date = z
      .object({
        tip: z.enum(["email", "telefon", "parola"]),
        parolaCurenta: z.string().min(1, "Scrie parola actuală."),
        valoareNoua: z.string().min(1, "Completează valoarea nouă."),
      })
      .parse(await request.json());
    const rezultat = await cereSchimbare({ userId: sesiune.userId, ...date });
    return rezultat.ok ? raspuns(rezultat.date) : eroare(rezultat.eroare, 422);
  } catch (error) {
    return eroareNeasteptata("eu-schimbare-cere", error);
  }
}

/** Pasul 2: codul primit pe email; aplică schimbarea. */
export async function PUT(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    const date = z.object({ token: z.string().min(10), cod: z.string().min(6, "Codul are 6 cifre.") }).parse(await request.json());
    const rezultat = await confirmaSchimbare({ userId: sesiune.userId, ...date });
    return rezultat.ok ? raspuns(rezultat.date) : eroare(rezultat.eroare, 422);
  } catch (error) {
    return eroareNeasteptata("eu-schimbare-confirma", error);
  }
}
