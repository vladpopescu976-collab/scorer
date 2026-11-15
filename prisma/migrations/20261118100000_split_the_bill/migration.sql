-- Split the bill: plata împărțită între organizator și prieteni.
CREATE TABLE "impartiri_plata" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizatorId" TEXT NOT NULL,
    "cod" TEXT NOT NULL,
    "numarParti" INTEGER NOT NULL,
    "sumaParte" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impartiri_plata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parti_impartire" (
    "id" TEXT NOT NULL,
    "impartireId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suma" DECIMAL(10,2) NOT NULL,
    "esteOrganizator" BOOLEAN NOT NULL DEFAULT false,
    "platitLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parti_impartire_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impartiri_plata_bookingId_key" ON "impartiri_plata"("bookingId");
CREATE UNIQUE INDEX "impartiri_plata_cod_key" ON "impartiri_plata"("cod");
CREATE INDEX "impartiri_plata_organizatorId_idx" ON "impartiri_plata"("organizatorId");
CREATE UNIQUE INDEX "parti_impartire_impartireId_userId_key" ON "parti_impartire"("impartireId", "userId");

ALTER TABLE "impartiri_plata" ADD CONSTRAINT "impartiri_plata_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "impartiri_plata" ADD CONSTRAINT "impartiri_plata_organizatorId_fkey" FOREIGN KEY ("organizatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parti_impartire" ADD CONSTRAINT "parti_impartire_impartireId_fkey" FOREIGN KEY ("impartireId") REFERENCES "impartiri_plata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parti_impartire" ADD CONSTRAINT "parti_impartire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
