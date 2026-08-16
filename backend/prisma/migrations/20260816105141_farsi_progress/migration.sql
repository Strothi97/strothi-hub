-- CreateTable
CREATE TABLE `farsi_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `mode` ENUM('VOCAB', 'SCRIPT') NOT NULL,
    `box` INTEGER NOT NULL DEFAULT 1,
    `dueAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `farsi_progress_userId_mode_dueAt_idx`(`userId`, `mode`, `dueAt`),
    UNIQUE INDEX `farsi_progress_userId_entryId_mode_key`(`userId`, `entryId`, `mode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `farsi_progress` ADD CONSTRAINT `farsi_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farsi_progress` ADD CONSTRAINT `farsi_progress_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `farsi_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
