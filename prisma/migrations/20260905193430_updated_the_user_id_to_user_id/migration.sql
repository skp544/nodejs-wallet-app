/*
  Warnings:

  - You are about to drop the column `userId` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `idx_user_id` ON `wallets`;

-- DropIndex
DROP INDEX `wallets_userId_key` ON `wallets`;

-- AlterTable
ALTER TABLE `wallets` DROP COLUMN `userId`,
    ADD COLUMN `user_id` BIGINT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `wallets_user_id_key` ON `wallets`(`user_id`);

-- CreateIndex
CREATE INDEX `idx_user_id` ON `wallets`(`user_id`);
