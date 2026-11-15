-- CreateTable
CREATE TABLE "note_jucatori" (
    "id" TEXT NOT NULL,
    "anuntId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "destinatarId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentariu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_jucatori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_jucatori_destinatarId_idx" ON "note_jucatori"("destinatarId");

-- CreateIndex
CREATE UNIQUE INDEX "note_jucatori_anuntId_autorId_destinatarId_key" ON "note_jucatori"("anuntId", "autorId", "destinatarId");

-- AddForeignKey
ALTER TABLE "note_jucatori" ADD CONSTRAINT "note_jucatori_anuntId_fkey" FOREIGN KEY ("anuntId") REFERENCES "anunturi_meci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_jucatori" ADD CONSTRAINT "note_jucatori_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_jucatori" ADD CONSTRAINT "note_jucatori_destinatarId_fkey" FOREIGN KEY ("destinatarId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

