import { LedgerType, Wallet } from "../../shared/types/shared-types";
import { ShardResolver } from "../../shared/database/shard-resolver";
import { connectionManager } from "../../shared/database/connection-manager";
import { WalletRepository } from "../../shared/repository/wallet.repository";
import { LedgerRepository } from "../../shared/repository/ledger.repository";

// writing business logic for wallet operations
export class WalletService {
  private walletRepository: WalletRepository;
  private ledgerRepository: LedgerRepository;

  constructor() {
    this.walletRepository = new WalletRepository();
    this.ledgerRepository = new LedgerRepository();
  }

  // create a wallet for a user
  // 1. to determine shard from user id
  // 2. start transaction on that shard
  // 3. check if wallet already exists
  // 4. create wallet

  async createWallet(userId: bigint): Promise<Wallet> {
    const shardId = ShardResolver.getShardId(userId);

    return await connectionManager.executeInTransaction(shardId, async (tx) => {
      const existingWallet = await this.walletRepository.findByUserId(
        userId,
        tx,
      );

      if (existingWallet) {
        throw new Error("Wallet already exists");
      }

      return await this.walletRepository.create(userId, tx);
    });
  }

  /**
   * Get wallet
   * 1. to determine shard
   * 2 use shard client
   * 3. read wallet
   */
  async getWallet(userId: bigint): Promise<Wallet | null> {
    const shardId = ShardResolver.getShardId(userId);

    const client = connectionManager.getClient(shardId);

    return await this.walletRepository.findByUserId(userId, client);
  }

  /**
   * Add money
   * 1. validate amount is positive
   * 2. determine shard
   * 3. start db transaction
   * 4. lock wallet row
   * 5. compute new balance
   * 6. update with version lock
   * 7. optionally create a new ledger entry if linked to a transaction
   *
   */

  async addMoney(
    userId: bigint,
    amount: bigint,
    transactionId?: bigint,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const shardId = ShardResolver.getShardId(userId);

    return await connectionManager.executeInTransaction(shardId, async (tx) => {
      // lock the wallet row to prevent concurrent modifications
      const wallet = await this.walletRepository.findByUserIdWithLock(
        userId,
        tx,
      );

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // update the balance with optimistic locking

      const newBalance = wallet.balance + amount;

      const updatedWallet = await this.walletRepository.updateBalance(
        wallet.id,
        newBalance,
        wallet.version,
        tx,
      );

      if (!updatedWallet) {
        throw new Error("Concurrent modification detected");
      }

      if (transactionId) {
        await this.ledgerRepository.create(
          userId,
          transactionId,
          amount,
          LedgerType.CREDIT,
          tx,
        );
      }

      return updatedWallet;
    });
  }

  /**
   * Debit and credit
   * these methods used by saga
   * they accept an existing transaction client (Tx)
   * that means the saga step controls the transaction boundary
   * they also create ledger entries
   */

  async debit(
    userId: bigint,
    amount: bigint,
    transactionId: bigint,
    tx: any,
  ): Promise<Wallet | null> {
    // debit with lock (tx already in transaction)
    const updatedWallet = await this.walletRepository.debit(userId, amount, tx);

    if (updatedWallet) {
      await this.ledgerRepository.create(
        userId,
        transactionId,
        amount,
        LedgerType.DEBIT,
        tx,
      );
    }
    return updatedWallet;
  }

  async credit(
    userId: bigint,
    amount: bigint,
    transactionId: bigint,
    tx: any,
  ): Promise<Wallet | null> {
    const wallet = await this.walletRepository.findByUserIdWithLock(userId, tx);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const updatedWallet = await this.walletRepository.credit(
      userId,
      amount,
      tx,
    );

    if (!updatedWallet) {
      throw new Error("Concurrent modification detected");
    }

    await this.ledgerRepository.create(
      userId,
      transactionId,
      amount,
      LedgerType.CREDIT,
      tx,
    );

    return updatedWallet;
  }
}
