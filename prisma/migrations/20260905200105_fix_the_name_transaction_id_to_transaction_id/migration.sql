/*
  Warnings:

  - You are about to drop the column `transaction_Id` on the `ledgers` table. All the data in the column will be lost.
  - Added the required column `transaction_id` to the `ledgers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `idx_transaction_id` ON `ledgers`;

-- AlterTable
ALTER TABLE `ledgers` DROP COLUMN `transaction_Id`,
    ADD COLUMN `transaction_id` BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX `idx_transaction_id` ON `ledgers`(`transaction_id`);
