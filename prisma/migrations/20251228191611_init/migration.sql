/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Certificate` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Certificate` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `Certificate` table. All the data in the column will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_templateId_fkey";

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "imageUrl",
DROP COLUMN "pdfUrl",
DROP COLUMN "templateId",
ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "qrData" TEXT;

-- DropTable
DROP TABLE "Template";
