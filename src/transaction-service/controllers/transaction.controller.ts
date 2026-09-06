import { Request, Response } from "express";
import { SagaOrchestrator } from "../../saga-orchestrator/services/saga-orchestrator";
import { TransactionService } from "../services/transaction.service";
import {
  TransactionResponseDTO,
  TransferDTO,
} from "../../shared/dtos/transaction.dto";
import { Transaction } from "../../shared/types/shared-types";
import { tryParseBigInt } from "../../shared/utils/http-params";

/**
 * Responsibilities
 * 1. extract data from request
 * 2. validate data
 * 3. convert to bigint
 * 4. call the saga orchestrator / transaction service
 * 5. convert domain object into JSON response
 * 6. return correct status code
 */

function toResponseDTO(transaction: Transaction): TransactionResponseDTO {
  return {
    id: transaction.id.toString(),
    fromUser: transaction.from_user.toString(),
    toUser: transaction.to_user.toString(),
    amount: transaction.amount.toString(),
    status: transaction.status,
    idempotencyKey: transaction.idempotency_key,
    created_at: transaction.created_at.toISOString(),
  };
}

export class TransactionController {
  private sagaOrchestrator: SagaOrchestrator;
  private transactionService: TransactionService;

  constructor() {
    this.sagaOrchestrator = new SagaOrchestrator();
    this.transactionService = new TransactionService();
  }

  /**
   * POST /api/transactions/transfer
   * Runs the transfer saga: debit sender, credit receiver, with compensation on failure.
   */
  async transfer(req: Request, res: Response): Promise<void> {
    try {
      const dto: TransferDTO = req.body;

      const fromUserParsed = tryParseBigInt(
        (dto as { fromUser?: unknown }).fromUser,
      );

      if (!fromUserParsed.ok) {
        res
          .status(400)
          .json({ success: false, error: "fromUser is required and must be valid" });
        return;
      }

      const toUserParsed = tryParseBigInt(
        (dto as { toUser?: unknown }).toUser,
      );

      if (!toUserParsed.ok) {
        res
          .status(400)
          .json({ success: false, error: "toUser is required and must be valid" });
        return;
      }

      const rawAmount = (dto as { amount?: unknown }).amount;

      if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
        res.status(400).json({ success: false, error: "amount is required" });
        return;
      }

      let amount: bigint;

      try {
        amount = BigInt(rawAmount as string | number | bigint);

        if (amount <= 0) {
          res.status(400).json({ success: false, error: "amount is invalid" });
          return;
        }
      } catch (err: any) {
        res.status(400).json({ success: false, error: "amount is invalid" });
        return;
      }

      const idempotencyKey =
        (req as any).idempotencyKey || (dto as { idempotencyKey?: string }).idempotencyKey;

      if (!idempotencyKey) {
        res
          .status(400)
          .json({ success: false, error: "idempotencyKey is required" });
        return;
      }

      const transaction = await this.sagaOrchestrator.transfer(
        fromUserParsed.value,
        toUserParsed.value,
        amount,
        idempotencyKey,
      );

      res.status(201).json({ success: true, data: toResponseDTO(transaction) });
    } catch (err: any) {
      const msg = err.message || "Something went wrong";

      if (
        msg.includes("Amount must be greater than 0") ||
        msg.includes("Sender and receiver cannot be the same")
      ) {
        res.status(400).json({ success: false, error: msg });
        return;
      }

      if (
        msg.toLowerCase().includes("insufficient balance") ||
        msg.toLowerCase().includes("concurrent modification")
      ) {
        res.status(409).json({ success: false, error: msg });
        return;
      }

      if (msg.includes("Transaction previously failed")) {
        res.status(409).json({ success: false, error: msg });
        return;
      }

      if (msg.toLowerCase().includes("wallet not found")) {
        res.status(400).json({ success: false, error: msg });
        return;
      }

      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * GET /api/transactions/:transactionId?fromUser=123
   * Transactions are sharded by the sender, so fromUser is required to resolve the shard.
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transactionIdParsed = tryParseBigInt(req.params.transactionId);

      if (!transactionIdParsed.ok) {
        res
          .status(400)
          .json({ success: false, error: "transactionId is invalid" });
        return;
      }

      const fromUserParsed = tryParseBigInt(req.query.fromUser);

      if (!fromUserParsed.ok) {
        res
          .status(400)
          .json({ success: false, error: "fromUser query param is required" });
        return;
      }

      const transaction = await this.transactionService.getTransaction(
        transactionIdParsed.value,
        fromUserParsed.value,
      );

      if (!transaction) {
        res.status(404).json({ success: false, error: "Transaction not found" });
        return;
      }

      res.status(200).json({ success: true, data: toResponseDTO(transaction) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/transactions/history/:userId
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userIdParsed = tryParseBigInt(req.params.userId);

      if (!userIdParsed.ok) {
        res.status(400).json({ success: false, error: "userId is invalid" });
        return;
      }

      const transactions = await this.transactionService.getHistory(
        userIdParsed.value,
      );

      res.status(200).json({
        success: true,
        data: transactions.map(toResponseDTO),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
