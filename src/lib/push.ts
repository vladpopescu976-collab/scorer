import http2 from "node:http2";
import { importPKCS8, SignJWT } from "jose";

import { prisma } from "@/lib/prisma";

/**
 * Notificări pe iPhone, prin serviciul Apple (APNs).
 *
 * Cheia vine din setările serverului (Vercel → Environment Variables):
 * - APNS_KEY_ID: ID-ul cheii .p8 din Apple Developer → Keys
 * - APNS_TEAM_ID: Team ID-ul contului de dezvoltator
 * - APNS_PRIVATE_KEY: conținutul fișierului .p8 (cu rândurile lui)
 * - APNS_BUNDLE_ID: implicit ro.scorer.app
 * - APNS_PRODUCTION: "1" pentru aplicația din App Store / TestFlight;
 *   lipsă = mediul de dezvoltare (aplicația pornită din Xcode)
 *
 * Fără cheie, nu se trimite nimic și nu se strică nimic.
 */

const BUNDLE = process.env.APNS_BUNDLE_ID || "ro.scorer.app";
const GAZDA = process.env.APNS_PRODUCTION === "1" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";

export const pushConfigurat = Boolean(
  process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY
);

let tokenApple: { valoare: string; creat: number } | null = null;

/** Apple cere un JWT semnat ES256, valabil cel mult o oră; îl refolosim 50 de minute. */
async function jwtApple(): Promise<string> {
  if (tokenApple && Date.now() - tokenApple.creat < 50 * 60_000) return tokenApple.valoare;
  const cheie = await importPKCS8(process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n"), "ES256");
  const valoare = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APNS_KEY_ID! })
    .setIssuer(process.env.APNS_TEAM_ID!)
    .setIssuedAt()
    .sign(cheie);
  tokenApple = { valoare, creat: Date.now() };
  return valoare;
}

type Notificare = { titlu: string; text: string; date?: Record<string, string> };

function trimiteLaUnul(
  sesiune: http2.ClientHttp2Session,
  jwt: string,
  tokenDispozitiv: string,
  n: Notificare
): Promise<number> {
  return new Promise((rezolva) => {
    const cerere = sesiune.request({
      ":method": "POST",
      ":path": `/3/device/${tokenDispozitiv}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });
    cerere.setEncoding("utf8");
    let cod = 0;
    cerere.on("response", (antete) => {
      cod = Number(antete[":status"] ?? 0);
    });
    cerere.on("data", () => {});
    cerere.on("end", () => rezolva(cod));
    cerere.on("error", () => rezolva(0));
    cerere.end(
      JSON.stringify({
        aps: { alert: { title: n.titlu, body: n.text }, sound: "default", badge: 1 },
        ...n.date,
      })
    );
  });
}

/** Trimite o notificare pe toate telefoanele contului. Nu aruncă niciodată. */
export async function trimiteNotificare(userId: string, n: Notificare): Promise<void> {
  if (!pushConfigurat) return;
  try {
    const dispozitive = await prisma.dispozitivPush.findMany({ where: { userId }, select: { token: true } });
    if (dispozitive.length === 0) return;

    const jwt = await jwtApple();
    const sesiune = http2.connect(GAZDA);
    sesiune.on("error", (err) => console.error("[push] conexiune APNs:", err));
    try {
      for (const { token } of dispozitive) {
        const cod = await trimiteLaUnul(sesiune, jwt, token, n);
        // 410 / 400: tokenul nu mai e valid (aplicație ștearsă, alt mediu).
        if (cod === 410 || cod === 400) {
          await prisma.dispozitivPush.delete({ where: { token } }).catch(() => {});
        } else if (cod !== 200) {
          console.error(`[push] APNs a răspuns ${cod} pentru ${token.slice(0, 8)}…`);
        }
      }
    } finally {
      sesiune.close();
    }
  } catch (eroare) {
    console.error("[push]", eroare);
  }
}

export async function inregistreazaDispozitiv(userId: string, token: string) {
  await prisma.dispozitivPush.upsert({
    where: { token },
    create: { token, userId },
    update: { userId },
  });
}

export async function stergeDispozitiv(token: string) {
  await prisma.dispozitivPush.deleteMany({ where: { token } });
}
