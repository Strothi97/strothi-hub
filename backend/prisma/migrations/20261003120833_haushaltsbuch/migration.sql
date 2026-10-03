-- CreateTable
CREATE TABLE `haushalt_konten` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `anfangsbestand` DECIMAL(12, 2) NOT NULL,
    `anfangsdatum` DATE NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `haushalt_kategorien` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `typ` ENUM('EINNAHME', 'AUSGABE') NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `haushalt_buchungen` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `datum` DATE NOT NULL,
    `betrag` DECIMAL(12, 2) NOT NULL,
    `typ` ENUM('EINNAHME', 'AUSGABE', 'UMBUCHUNG') NOT NULL,
    `kategorieId` VARCHAR(191) NULL,
    `kontoId` VARCHAR(191) NOT NULL,
    `zielKontoId` VARCHAR(191) NULL,
    `haendler` VARCHAR(191) NULL,
    `notiz` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `haushalt_buchungen_userId_datum_idx`(`userId`, `datum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `haushalt_konten` ADD CONSTRAINT `haushalt_konten_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_kategorien` ADD CONSTRAINT `haushalt_kategorien_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_kategorien` ADD CONSTRAINT `haushalt_kategorien_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `haushalt_kategorien`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_kategorieId_fkey` FOREIGN KEY (`kategorieId`) REFERENCES `haushalt_kategorien`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_kontoId_fkey` FOREIGN KEY (`kontoId`) REFERENCES `haushalt_konten`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `haushalt_buchungen` ADD CONSTRAINT `haushalt_buchungen_zielKontoId_fkey` FOREIGN KEY (`zielKontoId`) REFERENCES `haushalt_konten`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
