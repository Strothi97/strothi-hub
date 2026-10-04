-- Händler als eigene Liste pro Nutzer. Bestehende Buchungen bleiben erhalten:
-- vorhandene Händlernamen werden übernommen und den Buchungen zugeordnet.

CREATE TABLE `haushalt_haendler` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `haushalt_haendler_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `haushalt_haendler` ADD CONSTRAINT `haushalt_haendler_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `haushalt_haendler` (`id`, `userId`, `name`, `updatedAt`)
SELECT CONCAT('hd', REPLACE(UUID(), '-', '')), `userId`, MIN(TRIM(`haendler`)), NOW(3)
FROM `haushalt_buchungen`
WHERE `haendler` IS NOT NULL AND TRIM(`haendler`) <> ''
GROUP BY `userId`, LOWER(TRIM(`haendler`));

ALTER TABLE `haushalt_buchungen` ADD COLUMN `haendlerId` VARCHAR(191) NULL;

UPDATE `haushalt_buchungen` b
JOIN `haushalt_haendler` h ON h.`userId` = b.`userId` AND h.`name` = TRIM(b.`haendler`)
SET b.`haendlerId` = h.`id`
WHERE b.`haendler` IS NOT NULL AND TRIM(b.`haendler`) <> '';

ALTER TABLE `haushalt_buchungen` DROP COLUMN `haendler`;

ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_haendlerId_fkey` FOREIGN KEY (`haendlerId`) REFERENCES `haushalt_haendler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
