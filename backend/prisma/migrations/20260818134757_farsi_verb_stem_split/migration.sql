/*
  Warnings:

  - You are about to drop the column `verbStem` on the `farsi_entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `farsi_entries` DROP COLUMN `verbStem`,
    ADD COLUMN `verbStemLatin` VARCHAR(191) NULL,
    ADD COLUMN `verbStemScript` VARCHAR(191) NULL;
