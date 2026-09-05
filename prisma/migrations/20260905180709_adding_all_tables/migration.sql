-- CreateTable
CREATE TABLE `wallets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `balance` BIGINT NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_userId_key`(`userId`),
    INDEX `idx_user_id`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_user` BIGINT NOT NULL,
    `to_user` BIGINT NOT NULL,
    `amount` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'DEBITED', 'CREDITED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `idempotency_key` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_idempotency_key_key`(`idempotency_key`),
    INDEX `idx_from_user`(`from_user`),
    INDEX `idx_to_user`(`to_user`),
    INDEX `idx_idempotency_key`(`idempotency_key`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledgers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_Id` BIGINT NOT NULL,
    `transaction_Id` BIGINT NOT NULL,
    `amount` BIGINT NOT NULL,
    `type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_id`(`user_Id`),
    INDEX `idx_transaction_id`(`transaction_Id`),
    INDEX `idx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
