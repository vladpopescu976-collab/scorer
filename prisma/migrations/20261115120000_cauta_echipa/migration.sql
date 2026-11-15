-- CreateTable
CREATE TABLE "anunturi_jucator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "SportType" NOT NULL,
    "oras" TEXT NOT NULL,
    "orasCheie" TEXT NOT NULL,
    "pozitii" TEXT[],
    "nivel" "SkillLevel",
    "descriere" TEXT,
    "arataTelefon" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anunturi_jucator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitatii_jucator" (
    "anuntId" TEXT NOT NULL,
    "dinParteaId" TEXT NOT NULL,
    "mesaj" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitatii_jucator_pkey" PRIMARY KEY ("anuntId","dinParteaId")
);

-- CreateIndex
CREATE INDEX "anunturi_jucator_orasCheie_sport_idx" ON "anunturi_jucator"("orasCheie", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "anunturi_jucator_userId_sport_key" ON "anunturi_jucator"("userId", "sport");

-- AddForeignKey
ALTER TABLE "anunturi_jucator" ADD CONSTRAINT "anunturi_jucator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitatii_jucator" ADD CONSTRAINT "invitatii_jucator_anuntId_fkey" FOREIGN KEY ("anuntId") REFERENCES "anunturi_jucator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitatii_jucator" ADD CONSTRAINT "invitatii_jucator_dinParteaId_fkey" FOREIGN KEY ("dinParteaId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

