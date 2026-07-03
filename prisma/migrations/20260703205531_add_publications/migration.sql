-- CreateTable
CREATE TABLE "publication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "companyName" TEXT,
    "imageUrl" TEXT,
    "images" JSONB,
    "postType" TEXT NOT NULL DEFAULT 'single_image',
    "caption" TEXT NOT NULL,
    "scheduledDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approvalToken" TEXT NOT NULL,
    "clientComments" TEXT,
    "responsibleUser" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "imageSource" TEXT,
    "imageFileName" TEXT,
    "imageSize" INTEGER,
    "imageMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publication_approvalToken_key" ON "publication"("approvalToken");

-- CreateIndex
CREATE INDEX "publication_organizationId_idx" ON "publication"("organizationId");

-- CreateIndex
CREATE INDEX "publication_organizationId_status_idx" ON "publication"("organizationId", "status");

-- CreateIndex
CREATE INDEX "publication_approvalToken_idx" ON "publication"("approvalToken");

-- AddForeignKey
ALTER TABLE "publication" ADD CONSTRAINT "publication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication" ADD CONSTRAINT "publication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
