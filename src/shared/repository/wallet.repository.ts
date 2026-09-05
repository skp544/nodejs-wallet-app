import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { Wallet } from "../types/shared-types";

// handle all database operations for wallets using prisma

// row locking already implemented via prsima transactions
// optimistic locking > version column
export class WalletRepository {
  async create(userId: bigint, tx: Prisma.TransactionClient): Promise<Wallet> {
    const walletEntity = await tx.wallet.create({
      data: {
        user_id: userId,
        balance: BigInt(0),
        version: 0,
      },
    });

    return this.mapToWallet(walletEntity);
  }

  async findById(
    walletId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await client.wallet.findUnique({
      where: { id: walletId },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  async findByUserId(
    userId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await client.wallet.findUnique({
      where: { user_id: userId },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  // find the wallet by user id with row lever lock (select for update)
  // prevents concurrent updates

  async findByUserIdWithLock(
    userId: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    // prisma doesn't have direct way of select for update
    const result = await tx.$queryRaw<
      Array<{
        id: bigint;
        user_id: bigint;
        balance: bigint;
        version: number;
        created_at: Date;
        updated_at: Date;
      }>
    >`SELECT * FROM wallets 
      WHERE
    user_id = ${userId} FOR UPDATE`;

    if (result.length === 0) {
      return null;
    }
    const walletEntity = result[0];
    return this.mapToWallet(walletEntity);
  }

  async updateBalance(
    walletId: bigint,
    newBalance: bigint,
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const result = await tx.wallet.updateMany({
      where: { id: walletId, version: expectedVersion },
      data: { balance: newBalance, version: { increment: 1 } },
    });

    if (result.count === 0) {
      return null; // version mismatch due to concurrent  modification detected;
    }

    return await this.findById(walletId, tx);
  }

  async debit(
    userId: bigint,
    amount: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const wallet = await this.findByUserIdWithLock(userId, tx);

    if (!wallet) {
      return null;
    }

    if (wallet.balance < amount) {
      return null;
    }

    const newBalance = wallet.balance - amount;
    return await this.updateBalance(wallet.id, newBalance, wallet.version, tx);
  }

  async credit(
    userId: bigint,
    amount: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const wallet = await this.findByUserIdWithLock(userId, tx);

    if (!wallet) {
      return null;
    }

    const newBalance = wallet.balance + amount;
    return await this.updateBalance(wallet.id, newBalance, wallet.version, tx);
  }

  private mapToWallet(entity: {
    id: bigint;
    user_id: bigint;
    balance: bigint;
    version: number;
    created_at: Date;
    updated_at: Date;
  }): Wallet {
    return {
      id: entity.id,
      user_id: entity.user_id,
      balance: entity.balance,
      version: entity.version,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
