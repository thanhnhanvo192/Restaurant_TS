-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `duration_minutes` INTEGER UNSIGNED NOT NULL DEFAULT 120,
    ADD COLUMN `no_show_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'pending';
