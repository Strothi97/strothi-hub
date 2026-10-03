-- Testdaten der Konten-Variante werden verworfen (Umstellung auf Kasse + Kategorien)
DELETE FROM `haushalt_buchungen`;

ALTER TABLE `haushalt_buchungen` DROP FOREIGN KEY `haushalt_buchungen_kontoId_fkey`;
ALTER TABLE `haushalt_buchungen` DROP FOREIGN KEY `haushalt_buchungen_zielKontoId_fkey`;
ALTER TABLE `haushalt_buchungen` DROP FOREIGN KEY `haushalt_buchungen_kategorieId_fkey`;

ALTER TABLE `haushalt_buchungen` DROP COLUMN `typ`, DROP COLUMN `kontoId`, DROP COLUMN `zielKontoId`, MODIFY `kategorieId` VARCHAR(191) NOT NULL;

ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_kategorieId_fkey` FOREIGN KEY (`kategorieId`) REFERENCES `haushalt_kategorien`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE `haushalt_konten`;

ALTER TABLE `haushalt_kategorien` ADD COLUMN `inStatistik` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `haushalt_kasse` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startbetrag` DECIMAL(12, 2) NOT NULL,
    `startdatum` DATE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `haushalt_kasse_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `haushalt_kasse` ADD CONSTRAINT `haushalt_kasse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
