-- CreateTable
CREATE TABLE "dispozitive_push" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispozitive_push_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "dispozitive_push_userId_idx" ON "dispozitive_push"("userId");

-- AddForeignKey
ALTER TABLE "dispozitive_push" ADD CONSTRAINT "dispozitive_push_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

