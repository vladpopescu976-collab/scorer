import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { prisma } from "@/lib/prisma";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  isStorageConfigured,
  storageBucket,
  storageClient,
} from "@/lib/storage";

const PREFIX = "/api/poze/";

type Rezultat = { ok: true; adresa: string } | { ok: false; mesaj: string; cod: number };

/** Șterge poza veche din bucket, dacă era una încărcată de noi pentru acest cont. */
async function stergeDinBucket(imagine: string | null, userId: string) {
  if (!imagine?.startsWith(`${PREFIX}profil/${userId}/`) || !storageClient) return;
  try {
    await storageClient.send(
      new DeleteObjectCommand({ Bucket: storageBucket, Key: imagine.slice(PREFIX.length) })
    );
  } catch (err) {
    // Un fișier vechi rămas în bucket nu trebuie să blocheze schimbarea pozei.
    console.error("Poza veche de profil nu a putut fi ștearsă:", err);
  }
}

/**
 * Poza de profil, aceeași pentru site și aplicație. Înlocuiește poza veche,
 * pe care o șterge din bucket. Pozele stau sub profil/<userId>/.
 */
export async function salveazaPozaProfil(userId: string, fisier: File | undefined): Promise<Rezultat> {
  if (!isStorageConfigured || !storageClient) {
    return { ok: false, mesaj: "Încărcarea pozelor nu este configurată pe server.", cod: 503 };
  }
  if (!fisier) return { ok: false, mesaj: "Nu ai trimis nicio poză.", cod: 400 };

  const extensie = ALLOWED_IMAGE_TYPES[fisier.type];
  if (!extensie) return { ok: false, mesaj: "Folosește o poză JPG, PNG, WEBP sau AVIF.", cod: 400 };
  if (fisier.size > MAX_UPLOAD_BYTES) return { ok: false, mesaj: "Poza depășește limita de 4 MB.", cod: 400 };

  const cheie = `profil/${userId}/${randomUUID()}.${extensie}`;
  await storageClient.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: cheie,
      Body: Buffer.from(await fisier.arrayBuffer()),
      ContentType: fisier.type,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const adresa = `${PREFIX}${cheie}`;
  const inainte = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: adresa } });
  await stergeDinBucket(inainte?.image ?? null, userId);
  return { ok: true, adresa };
}

/** Scoate poza de profil; rămân inițialele. */
export async function stergePozaProfil(userId: string) {
  const inainte = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: null } });
  await stergeDinBucket(inainte?.image ?? null, userId);
}

/** Primul fișier din câmpul „files” al unui formular. */
export function primulFisier(formData: FormData): File | undefined {
  return formData.getAll("files").find((f): f is File => f instanceof File);
}
