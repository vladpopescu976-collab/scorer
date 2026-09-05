-- Optiuni platite peste pretul orei: nocturna, inchiriere echipament, vestiar
-- privat. Proprietarul le defineste pe teren, clientul le alege la rezervare.
CREATE TYPE "ExtraPricing" AS ENUM ('PER_HOUR', 'PER_BOOKING');

CREATE TABLE "field_extras" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "pricing" "ExtraPricing" NOT NULL DEFAULT 'PER_HOUR',
    -- Nocturna nu se poate lega de o ora fixa: la 18:00 in decembrie e bezna,
    -- iar in iunie mai sunt trei ore de lumina. Orele intunecate se calculeaza
    -- din data si din orasul terenului.
    "autoLaIntuneric" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "field_extras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "field_extras_fieldId_idx" ON "field_extras"("fieldId");

ALTER TABLE "field_extras" ADD CONSTRAINT "field_extras_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ce s-a ales efectiv la o rezervare. Numele si pretul se copiaza aici, ca o
-- schimbare de tarif de maine sa nu rescrie o rezervare de azi.
CREATE TABLE "booking_extras" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "pricing" "ExtraPricing" NOT NULL,
    "units" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "booking_extras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_extras_bookingId_idx" ON "booking_extras"("bookingId");

ALTER TABLE "booking_extras" ADD CONSTRAINT "booking_extras_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
