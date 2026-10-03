-- AlterTable
ALTER TABLE `exercises` ADD COLUMN `secondaryUnit` ENUM('KG', 'G', 'S', 'MIN', 'H', 'KM', 'M', 'BODYWEIGHT') NULL,
    MODIFY `unit` ENUM('KG', 'G', 'S', 'MIN', 'H', 'KM', 'M', 'BODYWEIGHT') NOT NULL;

-- AlterTable
ALTER TABLE `set_entries` ADD COLUMN `secondaryValue` DOUBLE NULL;
