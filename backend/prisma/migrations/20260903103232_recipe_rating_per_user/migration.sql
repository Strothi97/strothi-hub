-- CreateTable
CREATE TABLE `recipe_ratings` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,

    UNIQUE INDEX `recipe_ratings_recipeId_userId_key`(`recipeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipe_ratings` ADD CONSTRAINT `recipe_ratings_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ratings` ADD CONSTRAINT `recipe_ratings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestehende (bisher einzelne) Bewertungen als erste RecipeRating-Zeile für
-- den jeweiligen Ersteller übernehmen, damit sie nicht verloren gehen — die
-- Recipe.rating-Spalte selbst wird ab jetzt nicht mehr beschrieben (siehe
-- schema.prisma-Kommentar).
INSERT INTO `recipe_ratings` (`id`, `recipeId`, `userId`, `value`)
SELECT UUID(), `id`, `userId`, `rating`
FROM `recipes`
WHERE `rating` IS NOT NULL;
