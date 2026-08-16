-- CreateTable
CREATE TABLE `farsi_letter_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `letterChar` VARCHAR(191) NOT NULL,
    `box` INTEGER NOT NULL DEFAULT 1,
    `dueAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `farsi_letter_progress_userId_dueAt_idx`(`userId`, `dueAt`),
    UNIQUE INDEX `farsi_letter_progress_userId_letterChar_key`(`userId`, `letterChar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `farsi_letter_progress` ADD CONSTRAINT `farsi_letter_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
