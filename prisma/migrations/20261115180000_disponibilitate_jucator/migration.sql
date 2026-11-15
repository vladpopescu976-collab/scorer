-- AlterTable
ALTER TABLE "anunturi_jucator" ADD COLUMN     "oraDe" INTEGER,
ADD COLUMN     "oraPana" INTEGER,
ADD COLUMN     "zile" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

