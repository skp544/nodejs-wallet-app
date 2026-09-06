import { connectionManager } from "../../shared/database/connection-manager";
import { WalletService } from "../../wallet-service/services/wallet.service";
import { SagaContext } from "../types/saga-context";
import { SagaStep } from "../types/saga-steps";
/**
 * Forward action:
 * start transaction on sender shard
 * lock sender wallet
 * debit amount
 * write a ledger debit
 * mark context.debitCommitted = true
 */

/**
 * Failure
 * if insufficeint balance, throw
 */

/**
 * compensation:
 * if debit committed, credit sender back
 */

export class DebitSenderStep implements SagaStep {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getName(): string {
    return "DebitSenderStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    await connectionManager.executeInTransaction(
      context.fromShardId,
      async (tx) => {
        const debitWallet = await this.walletService.debit(
          context.fromUser,
          context.transaction!.amount,
          context.transaction!.id,
          tx,
        );

        if (!debitWallet) {
          throw new Error(
            "Insufficient balance or concurrent modification detected",
          );
        }
      },
    );
    context.debitCommitted = true;
    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    // if the debit was committed, credit the sender back
    if (context.debitCommitted) {
      await connectionManager.executeInTransaction(
        context.fromShardId,
        async (tx) => {
          await this.walletService.credit(
            context.fromUser,
            context.transaction!.amount,
            context.transaction!.id,
            tx,
          );
        },
      );
    }
  }
}
