-- AlterTable
ALTER TABLE `users` ADD COLUMN `hideComingSoonTools` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `toolOrder` JSON NULL;
