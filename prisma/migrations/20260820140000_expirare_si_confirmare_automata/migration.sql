-- 1. O rezervare la care proprietarul nu a raspuns pana la ora ei nu mai are
-- ce sa fie confirmata. Nu e nici anulare a clientului, nici refuz, asa ca
-- primeste status propriu. Constrangerea de suprapuneri numara doar PENDING si
-- CONFIRMED, deci o rezervare expirata elibereaza ora de la sine.
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- 2. Rezervarile facute cu destul timp inainte se pot confirma singure;
-- proprietarul vrea sa se uite doar la cele de ultim moment. Zero inseamna
-- confirmare manuala pentru tot.
ALTER TABLE "fields" ADD COLUMN "autoConfirmDays" INTEGER NOT NULL DEFAULT 2;
