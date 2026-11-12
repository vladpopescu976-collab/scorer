
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "vizibilInCautare" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "anunturi_meci" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "sport" "SportType" NOT NULL,
    "oras" TEXT NOT NULL,
    "orasCheie" TEXT NOT NULL,
    "inceput" TIMESTAMP(3) NOT NULL,
    "locatie" TEXT,
    "format" TEXT,
    "jucatoriNecesari" INTEGER NOT NULL,
    "nivel" "SkillLevel",
    "descriere" TEXT,
    "arataTelefon" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anunturi_meci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jucatori_meci" (
    "anuntId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jucatori_meci_pkey" PRIMARY KEY ("anuntId","userId")
);

-- CreateIndex
CREATE INDEX "anunturi_meci_orasCheie_inceput_idx" ON "anunturi_meci"("orasCheie", "inceput");

-- CreateIndex
CREATE INDEX "anunturi_meci_inceput_idx" ON "anunturi_meci"("inceput");

-- CreateIndex
CREATE INDEX "jucatori_meci_userId_idx" ON "jucatori_meci"("userId");

-- AddForeignKey
ALTER TABLE "anunturi_meci" ADD CONSTRAINT "anunturi_meci_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jucatori_meci" ADD CONSTRAINT "jucatori_meci_anuntId_fkey" FOREIGN KEY ("anuntId") REFERENCES "anunturi_meci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jucatori_meci" ADD CONSTRAINT "jucatori_meci_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

