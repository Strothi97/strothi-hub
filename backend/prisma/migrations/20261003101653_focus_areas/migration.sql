-- CreateTable
CREATE TABLE `focus_areas` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `focus_areas_userId_key_key`(`userId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `focus_areas` ADD CONSTRAINT `focus_areas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Standardbereiche für alle bestehenden Nutzer (Schlüssel bleiben identisch zu den bisherigen festen Werten)
INSERT INTO `focus_areas` (`id`, `userId`, `key`, `name`, `icon`, `sortOrder`, `updatedAt`)
SELECT CONCAT('fa', REPLACE(UUID(), '-', '')), u.`id`, d.`k`, d.`n`, d.`i`, d.`o`, NOW(3)
FROM `users` u
CROSS JOIN (
  SELECT 'brust' AS k, 'Brust' AS n, '💪' AS i, 0 AS o
  UNION ALL SELECT 'ruecken', 'Rücken', '🔙', 1
  UNION ALL SELECT 'beine', 'Beine', '🦵', 2
  UNION ALL SELECT 'schultern', 'Schultern', '🏋️', 3
  UNION ALL SELECT 'bizeps', 'Bizeps', '💪', 4
  UNION ALL SELECT 'trizeps', 'Trizeps', '💪', 5
  UNION ALL SELECT 'bauch', 'Bauch', '🔥', 6
  UNION ALL SELECT 'ganzkoerper', 'Ganzkörper', '🤸', 7
  UNION ALL SELECT 'cardio', 'Cardio', '🏃', 8
) d;
