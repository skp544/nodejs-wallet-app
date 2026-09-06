import { SagaStep } from "../types/saga-steps";
import { SagaContext } from "../types/saga-context";
import { TransactionService } from "../../transaction-service/services/transaction.service";

/**
 * Forward Action:
 * Check if transaction already exists by idempotency key.
 * if yes, put into context and return
 * if no, create a new PENDING transaction
 */

/**
 * Compensation
 * No direct undo
 * the orchestrator can mark transaction as FAILED
 */

export class CreateTransactionStep implements SagaStep {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getName(): string {
    return "CreateTransactionStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    const existing =
      await this.transactionService.getTransactionByIdempotencyKey(
        context.idempotencyKey,
        context.fromUser,
      );

    if (existing) {
      context.transaction = existing;
      return context;
    }

    const transaction = await this.transactionService.createTransaction(
      context.fromUser,
      context.toUser,
      context.amount,
      context.idempotencyKey,
    );

    context.transaction = transaction;

    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    // not compensation need for creating a transaction record
    // transaction can be marked as FAILED by the orchestrator
    // this step is idempotent -> creating a transaction record doesn't change the state of the system
  }
}
