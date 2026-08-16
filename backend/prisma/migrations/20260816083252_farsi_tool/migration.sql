-- CreateTable
CREATE TABLE `farsi_entries` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `german` JSON NOT NULL,
    `persianLatin` JSON NOT NULL,
    `persianScript` VARCHAR(191) NULL,
    `type` ENUM('NOUN', 'VERB', 'ADJECTIVE', 'PHRASE', 'LETTER', 'OTHER') NULL,
    `meaning` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `farsi_entries` ADD CONSTRAINT `farsi_entries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
