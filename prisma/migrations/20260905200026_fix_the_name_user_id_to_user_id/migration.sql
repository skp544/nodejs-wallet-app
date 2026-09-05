/*
  Warnings:

  - You are about to drop the column `user_Id` on the `ledgers` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `ledgers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `idx_user_id` ON `ledgers`;

-- AlterTable
ALTER TABLE `ledgers` DROP COLUMN `user_Id`,
    ADD COLUMN `user_id` BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX `idx_user_id` ON `ledgers`(`user_id`);
