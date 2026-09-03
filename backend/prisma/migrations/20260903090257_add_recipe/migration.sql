-- CreateTable
CREATE TABLE `recipes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `allergens` JSON NULL,
    `prepTimeMinMinutes` INTEGER NULL,
    `prepTimeMaxMinutes` INTEGER NULL,
    `kcal` INTEGER NULL,
    `photoUrl` VARCHAR(191) NULL,
    `servingSizes` JSON NOT NULL,
    `pantryStaples` JSON NULL,
    `ingredients` JSON NOT NULL,
    `steps` JSON NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
