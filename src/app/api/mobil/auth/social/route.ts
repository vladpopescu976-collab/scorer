import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { creeazaToken } from "@/lib/api/token";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { autentificaSocial } from "@/lib/social";

export const maxDuration = 60;

const schema = z.object({
  furnizor: z.enum(["apple", "google"]),
  /** Tokenul de identitate primit de aplicație de la furnizor. */
  token: z.string().min(20),
  role: z.enum(["PERSONAL", "BUSINESS"]),
  /** Apple trimite numele doar la prima autentificare, și doar aplicației. */
  nume: z.string().trim().max(100).optional(),
});

const apple = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const google = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    let claims: { email?: string; email_verified?: boolean | string; name?: string };
    try {
      if (date.furnizor === "apple") {
        const audienta = process.env.APPLE_BUNDLE_ID || "ro.scorer.app";
        ({ payload: claims } = await jwtVerify(date.token, apple, {
          issuer: "https://appleid.apple.com",
          audience: audienta,
        }));
      } else {
        const audienta = process.env.GOOGLE_IOS_CLIENT_ID;
        if (!audienta) return eroare("Autentificarea cu Google nu este configurată.", 501);
        ({ payload: claims } = await jwtVerify(date.token, google, {
          issuer: ["https://accounts.google.com", "accounts.google.com"],
          audience: audienta,
        }));
      }
    } catch {
      return eroare("Nu am putut verifica autentificarea. Încearcă din nou.", 401);
    }

    const rezultat = await autentificaSocial({
      email: claims.email,
      // Apple și Google trimit uneori valoarea ca text, nu ca boolean.
      emailConfirmat: claims.email_verified === true || claims.email_verified === "true",
      nume: date.nume || claims.name,
      rol: date.role,
    });
    if (!rezultat.ok) return eroare(rezultat.eroare, 401);

    const token = await creeazaToken({ userId: rezultat.id, role: rezultat.rol });
    return raspuns({
      token,
      utilizator: {
        id: rezultat.id,
        nume: rezultat.nume,
        email: rezultat.email,
        rol: rezultat.rol,
        telefon: rezultat.telefon,
      },
    });
  } catch (error) {
    return eroareNeasteptata("auth-social", error);
  }
}
