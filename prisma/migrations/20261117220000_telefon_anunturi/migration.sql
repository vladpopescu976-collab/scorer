-- Numărul la care poți fi sunat: organizatorul meciului și echipa care cheamă un jucător.
ALTER TABLE "anunturi_meci" ADD COLUMN "telefon" TEXT;
ALTER TABLE "invitatii_jucator" ADD COLUMN "telefon" TEXT;
ALTER TABLE "anunturi_jucator" ADD COLUMN "telefon" TEXT;
