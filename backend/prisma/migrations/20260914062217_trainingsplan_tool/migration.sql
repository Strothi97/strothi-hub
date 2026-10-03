-- CreateTable
CREATE TABLE `exercises` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `focusAreas` JSON NOT NULL,
    `unit` ENUM('KG', 'G', 'S', 'MIN', 'H', 'KM', 'M') NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `infoSections` JSON NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_sessions_userId_performedAt_idx`(`userId`, `performedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_exercises` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `set_entries` (
    `id` VARCHAR(191) NOT NULL,
    `sessionExerciseId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `value` DOUBLE NULL,
    `reps` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_sessions` ADD CONSTRAINT `training_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_exercises` ADD CONSTRAINT `session_exercises_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `training_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_exercises` ADD CONSTRAINT `session_exercises_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `set_entries` ADD CONSTRAINT `set_entries_sessionExerciseId_fkey` FOREIGN KEY (`sessionExerciseId`) REFERENCES `session_exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
