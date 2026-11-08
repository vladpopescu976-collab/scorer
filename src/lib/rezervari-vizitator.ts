import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";
import { urlAplicatie } from "@/lib/email";
import { expiraRezervarile } from "@/lib/rezervari-expirate";

/** Linkul prin care vizitatorul își regăsește rezervarea. */
export function linkRezervare(token: string): string {
  return `${urlAplicatie()}/rezervarea-mea/${token}`;
}

export function amprentaToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenNou(): string {
  return randomBytes(24).toString("hex");
}

function semnatura(bookingId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET lipsește.");
  return createHmac("sha256", secret).update(`rezervare-vizitator:${bookingId}`).digest("base64url");
}

/**
 * Link semnat, pe care îl putem pune în orice email ulterior („confirmată”,
 * „ți s-a propus altă oră”…). Tokenul din primul email există doar acolo — în
 * baza de date ținem amprenta lui —, așa că mesajele de după trimiteau
 * vizitatorul spre „Rezervările mele”, care cere cont.
 */
export function tokenSemnat(bookingId: string): string {
  return `${bookingId}.${semnatura(bookingId)}`;
}

/** Id-ul rezervării dintr-un token semnat, dacă semnătura e bună. */
function idDinTokenSemnat(token: string): string | null {
  const punct = token.lastIndexOf(".");
  if (punct <= 0) return null;
  const id = token.slice(0, punct);
  const primita = Buffer.from(token.slice(punct + 1));
  const asteptata = Buffer.from(semnatura(id));
  return primita.length === asteptata.length && timingSafeEqual(primita, asteptata) ? id : null;
}

/** Rezervarea din spatele unui link, dacă tokenul e bun. */
export async function rezervareaDinToken(token: string) {
  const curat = token.trim();
  if (!curat) return null;

  // Două feluri de linkuri: cel aleator din primul email și cel semnat din
  // emailurile de după. Cel semnat merge doar pentru rezervări fără cont.
  const id = idDinTokenSemnat(curat);
  const unde = id ? { id, customerId: null } : { guestTokenHash: amprentaToken(curat) };

  // Vizitatorul trebuie sa vada „Expirata”, nu „In asteptare”, pentru o ora
  // care a trecut fara raspuns.
  await expiraRezervarile(unde);

  return prisma.booking.findFirst({
    where: unde,
    include: {
      field: {
        select: { id: true, name: true, city: true, address: true, contactPhone: true },
      },
      extras: true,
    },
  });
}
