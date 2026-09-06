import { TransactionRepository } from "../../shared/repository/transaction.repository";
import { connectionManager } from "../../shared/database/connection-manager";
import {
  ShardId,
  Transaction,
  TransactionStatus,
} from "../../shared/types/shared-types";
import { ShardResolver } from "../../shared/database/shard-resolver";

export class TransactionService {
  private transactionRepository: TransactionRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  /**
   * Create transaction
   * 1. determine sender shard from user
   * 2. start transaction on that shard
   * 3. check existing transaction by idempotency key
   * 4. if found , return it
   * 5. Otherwise, create a new PENDING row
   */

  async createTransaction(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);

    return await connectionManager.executeInTransaction(shardId, async (tx) => {
      const existing = await this.transactionRepository.findByIdempotencyKey(
        idempotencyKey,
        tx,
      );

      if (existing) {
        return existing;
      }

      return await this.transactionRepository.create(
        fromUser,
        toUser,
        amount,
        idempotencyKey,
        tx,
      );
    });
  }

  /**
   * Update the transaction status
   * 1. determine sender shard
   * 2. update transaction status
   * PENDING -> DEBITED -> CREDITED
   * PENDING -> FAILED
   * DEBITED -> FAILED (after timeout)
   */

  async updateStatus(
    transactionId: bigint,
    status: TransactionStatus,
    fromUser: bigint,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);

    return await connectionManager.executeInTransaction(shardId, async (tx) => {
      const transaction = await this.transactionRepository.updateStatus(
        transactionId,
        status,
        tx,
      );

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return transaction;
    });
  }

  /**
   * Get history
   * calls repository history method that queries both shards
   */

  async getHistory(userId: bigint): Promise<Transaction[]> {
    const clint1 = connectionManager.getClient(ShardId.SHARD_1);
    const clint2 = connectionManager.getClient(ShardId.SHARD_2);

    return await this.transactionRepository.getHistory(userId, clint1, clint2);
  }

  async getTransactionByIdempotencyKey(
    idempotencyKey: string,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);

    const client = connectionManager.getClient(shardId);

    return await this.transactionRepository.findByIdempotencyKey(
      idempotencyKey,
      client,
    );
  }

  async getTransaction(
    transactionId: bigint,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);

    const client = connectionManager.getClient(shardId);

    return await this.transactionRepository.findById(transactionId, client);
  }
}
