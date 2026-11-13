-- CreateTable
CREATE TABLE "notificari" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titlu" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ecran" TEXT,
    "citita" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificari_userId_createdAt_idx" ON "notificari"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notificari" ADD CONSTRAINT "notificari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

