import { connectionManager } from "../../shared/database/connection-manager";
import { WalletService } from "../../wallet-service/services/wallet.service";
import { SagaContext } from "../types/saga-context";
import { SagaStep } from "../types/saga-steps";

/**
 * Forward action:
 * start transaction on Receiver shard
 * lock Receiver wallet
 * credit amount
 * write a ledger credit
 *
 */

/**
 * compensation:
 * if credit committed, debit Receiver back
 */

export class CreditReceiverStep implements SagaStep {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }
  getName(): string {
    return "CreditReceiverStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    await connectionManager.executeInTransaction(
      context.toShardId,
      async (tx) => {
        await this.walletService.credit(
          context.toUser,
          context.amount,
          context.transaction!.id,
          tx,
        );
      },
    );

    context.creditCommitted = true;
    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    if (context.creditCommitted) {
      await connectionManager.executeInTransaction(
        context.toShardId,
        async (tx) => {
          const debitedWallet = await this.walletService.debit(
            context.toUser!,
            context.amount,
            context.transaction!.id,
            tx,
          );

          if (!debitedWallet) {
            throw new Error(
              // this is a critical failure but cant't reverse it
              "Failed to compensate credit - manual intervention required",
            );
          }
        },
      );
    }
  }
}
