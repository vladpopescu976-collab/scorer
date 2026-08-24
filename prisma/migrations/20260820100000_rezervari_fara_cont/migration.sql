-- O rezervare se poate face si fara cont. Clientul devine optional, iar datele
-- de contact ale vizitatorului stau pe rezervare. Tokenul ii da un link prin
-- care isi vede si isi anuleaza rezervarea, fiindca nu are unde altundeva sa o
-- caute; in tabel pastram doar amprenta lui.
ALTER TABLE "bookings" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "bookings" ADD COLUMN "guestName" TEXT;
ALTER TABLE "bookings" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "bookings" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "bookings" ADD COLUMN "guestTokenHash" TEXT;

CREATE UNIQUE INDEX "bookings_guestTokenHash_key" ON "bookings"("guestTokenHash");

-- O rezervare trebuie sa aiba fie un cont, fie datele unui vizitator. Fara
-- regula asta ar putea aparea rezervari fara niciun contact.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_sau_vizitator"
  CHECK ("customerId" IS NOT NULL OR ("guestName" IS NOT NULL AND "guestPhone" IS NOT NULL));
