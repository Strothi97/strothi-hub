-- AlterTable: neue Spalte "position", bestehende Zeilen bekommen
-- "isolated" als Rückwirkungs-Annahme (die tatsächlich gezeigte Position
-- wurde vor dieser Migration nicht gespeichert).
ALTER TABLE `farsi_letter_progress` ADD COLUMN `position` VARCHAR(191) NOT NULL DEFAULT 'isolated';
ALTER TABLE `farsi_letter_progress` ALTER COLUMN `position` DROP DEFAULT;

-- Unique-Index von (userId, letterChar) auf (userId, letterChar, position) umstellen
DROP INDEX `farsi_letter_progress_userId_letterChar_key` ON `farsi_letter_progress`;
CREATE UNIQUE INDEX `farsi_letter_progress_userId_letterChar_position_key` ON `farsi_letter_progress`(`userId`, `letterChar`, `position`);
