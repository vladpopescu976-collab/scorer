-- Invitația spune unde și când e meciul.
ALTER TABLE "invitatii_jucator" ADD COLUMN "teren" TEXT;
ALTER TABLE "invitatii_jucator" ADD COLUMN "dataOra" TIMESTAMP(3);
ALTER TABLE "invitatii_jucator" ADD COLUMN "durata" INTEGER;
ALTER TABLE "invitatii_jucator" ADD COLUMN "pret" INTEGER;
