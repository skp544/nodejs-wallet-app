import { TransactionStatus } from "../../generated/prisma/enums";
import { logger } from "../../shared/config/logger";
import { ShardResolver } from "../../shared/database/shard-resolver";
import { TransactionService } from "../../transaction-service/services/transaction.service";
import { CreateTransactionStep } from "../steps/create-transaction.step";
import { CreditReceiverStep } from "../steps/credit-reciever.step";
import { DebitSenderStep } from "../steps/debit-sender.step";
import {
  UpdateStatusCreditedStep,
  UpdateStatusDebitedStep,
} from "../steps/update-status.step";
import { SagaContext } from "../types/saga-context";
import { SagaStep } from "../types/saga-steps";

export class SagaOrchestrator {
  private transactionService: TransactionService;
  private steps: SagaStep[];

  constructor() {
    this.transactionService = new TransactionService();

    this.steps = [
      new CreateTransactionStep(),
      new DebitSenderStep(),
      new UpdateStatusDebitedStep(),
      new CreditReceiverStep(),
      new UpdateStatusCreditedStep(),
    ];
  }

  /**
   * Execute transfer saga
   * this orchestrates the sags by executing the steps in sequence
   * if any steps fails , compensate all completed steps in reverse order
   */

  async transfer(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (fromUser === toUser) {
      throw new Error("Sender and receiver cannot be the same");
    }

    const fromShardId = ShardResolver.getShardId(fromUser);
    const toShardId = ShardResolver.getShardId(toUser);

    const context: SagaContext = {
      fromUser,
      toUser,
      amount,
      idempotencyKey,
      fromShardId,
      toShardId,
    };

    const completedSteps: SagaStep[] = [];

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];

        logger.info(
          `Executing step ${i + 1}/${this.steps.length}:${step.getName()} `,
        );

        if (context.transaction) {
          const status = context.transaction.status;

          if (status === TransactionStatus.CREDITED) {
            return context.transaction;
          }

          if (status === TransactionStatus.FAILED) {
            throw new Error("Transaction previously failed");
          }

          if (status === TransactionStatus.DEBITED) {
            if (i < 3) {
              continue;
            }
          }
        }

        const updatedContext = await step.execute(context);

        Object.assign(context, updatedContext);

        completedSteps.push(step);
      }

      if (!context.transaction) {
        throw new Error("Transaction not found after saga execution");
      }
      return context.transaction;
    } catch (err) {
      await this.compensate(completedSteps, context);

      if (context.transaction) {
        try {
          await this.transactionService.updateStatus(
            context.transaction.id,
            TransactionStatus.FAILED,
            context.fromUser,
          );
        } catch (statusErr) {
          logger.error("Failed to revert transaction status", statusErr);
        }
      }

      throw err;
    }
  }

  private async compensate(
    completedSteps: SagaStep[],
    context: SagaContext,
  ): Promise<void> {
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];

      try {
        logger.info(
          `Compensating step ${i + 1}/${completedSteps.length}: ${step.getName()}`,
        );

        await step.compensate(context);
      } catch (err) {
        logger.error(
          `Failed to compensate step ${i + 1}/${completedSteps.length}: ${step.getName()}`,
          err,
        );
        if (step.getName() === "DebitSenderStep") {
          logger.error(
            "[CRITICAL] Failed to compensate debit - Manual interruption required",
          );
        }
      }
    }
  }

  getSteps(): SagaStep[] {
    return this.steps;
  }
}
