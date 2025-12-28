/*
  Warnings:

  - You are about to drop the `certificate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "certificate";

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "templateUrl" TEXT NOT NULL,
    "nameX" INTEGER NOT NULL,
    "nameY" INTEGER NOT NULL,
    "qrX" INTEGER NOT NULL,
    "qrY" INTEGER NOT NULL,
    "fontSize" INTEGER NOT NULL,
    "fontFamily" TEXT NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "certificateNumber" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
