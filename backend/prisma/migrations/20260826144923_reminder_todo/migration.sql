-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `isTodo` BOOLEAN NOT NULL DEFAULT false;
