-- Alăturarea la un meci devine cerere: organizatorul alege pe cine ia.
-- Cei deja alăturați rămân acceptați; cererile noi pornesc ca „CERERE”.
ALTER TABLE "jucatori_meci" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACCEPTAT';
ALTER TABLE "jucatori_meci" ALTER COLUMN "status" SET DEFAULT 'CERERE';
ALTER TABLE "jucatori_meci" ADD COLUMN "pozitii" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "jucatori_meci" ADD COLUMN "nivel" "SkillLevel";
