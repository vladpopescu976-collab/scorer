import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { urlAplicatie } from "@/lib/email";

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

/** Rezervarea din spatele unui link, dacă tokenul e bun. */
export async function rezervareaDinToken(token: string) {
  const curat = token.trim();
  if (!curat) return null;

  return prisma.booking.findUnique({
    where: { guestTokenHash: amprentaToken(curat) },
    include: {
      field: {
        select: { id: true, name: true, city: true, address: true, contactPhone: true },
      },
    },
  });
}
