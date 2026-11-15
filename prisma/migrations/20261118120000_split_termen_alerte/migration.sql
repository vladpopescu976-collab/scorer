-- Split the bill: termen de strângere a banilor și starea împărțirii.
-- Rândurile existente (dacă sunt) primesc termenul „acum”, apoi valoarea implicită se scoate.
ALTER TABLE "impartiri_plata" ADD COLUMN "stare" TEXT NOT NULL DEFAULT 'STRANGE',
ADD COLUMN "termen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "impartiri_plata" ALTER COLUMN "termen" DROP DEFAULT;

CREATE INDEX "impartiri_plata_stare_termen_idx" ON "impartiri_plata"("stare", "termen");

-- „Anunță-mă dacă se eliberează”.
CREATE TABLE "alerte_teren" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notificatLa" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerte_teren_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alerte_teren_fieldId_startTime_idx" ON "alerte_teren"("fieldId", "startTime");
CREATE UNIQUE INDEX "alerte_teren_userId_fieldId_startTime_key" ON "alerte_teren"("userId", "fieldId", "startTime");

ALTER TABLE "alerte_teren" ADD CONSTRAINT "alerte_teren_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerte_teren" ADD CONSTRAINT "alerte_teren_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
