import { Request, Response } from "express";
import { WalletService } from "../services/wallet.service";
import {
  AddMoneyDTO,
  CreateWalletDTO,
  WalletResponseDTO,
} from "../../shared/dtos/wallet.dto";
import { tryParseBigInt as tryParseBigIntPathSegment } from "../../shared/utils/http-params";

/**
 * Responsibilities
 * 1. extract data from request
 * 2. validate data
 * 3. convert to bigint
 * 4. call service
 * 5. convert domain object in JSON response
 * 6. return correct status code
 *
 */

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateWalletDTO = req.body;

      const rawUserId = (dto as { userId?: unknown }).userId;

      if (rawUserId === undefined || rawUserId === null || rawUserId === "") {
        res.status(400).json({ success: false, error: "userId is required" });
        return;
      }

      let userId: bigint;

      try {
        userId = BigInt(rawUserId as string | number | bigint);
      } catch (err: any) {
        res.status(400).json({ success: false, error: "userId is invalid" });
        return;
      }

      const wallet = await this.walletService.createWallet(userId);

      const response: WalletResponseDTO = {
        id: wallet.id.toString(),
        userId: wallet.user_id.toString(),
        balance: wallet.balance.toString(),
        version: wallet.version,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString(),
      };

      res.status(201).json({ success: true, data: response });
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      if (msg.includes("already exists")) {
        res.status(409).json({ success: false, error: msg });
        return;
      }
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * GET : /api/wallets/:userId
   */
  async getWallet(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.params.userId;
      const parsed = tryParseBigIntPathSegment(
        typeof userIdParam === "string" ? userIdParam : undefined,
      );

      if (!parsed.ok) {
        res.status(400).json({ success: false, error: "userId is invalid" });
        return;
      }

      const wallet = await this.walletService.getWallet(parsed.value);

      if (!wallet) {
        res.status(404).json({ success: false, error: "Wallet not found" });
        return;
      }

      const response: WalletResponseDTO = {
        id: wallet.id.toString(),
        userId: wallet.user_id.toString(),
        balance: wallet.balance.toString(),
        version: wallet.version,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString(),
      };

      res.status(200).json({ success: true, data: response });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST : /api/wallets/:userId/add-money
   */

  async addMoney(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.params.userId;
      const parsed = tryParseBigIntPathSegment(
        typeof userIdParam === "string" ? userIdParam : undefined,
      );

      if (!parsed.ok) {
        res.status(400).json({ success: false, error: "userId is invalid" });
        return;
      }

      const dto: AddMoneyDTO = req.body;

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

      const wallet = await this.walletService.addMoney(
        parsed.value,
        amount,
        undefined,
      );

      const response: WalletResponseDTO = {
        id: wallet.id.toString(),
        userId: wallet.user_id.toString(),
        balance: wallet.balance.toString(),
        version: wallet.version,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString(),
      };

      res.status(200).json({ success: true, data: response });
    } catch (err: any) {
      const msg = err.message || "Something went wrong";

      if (msg.includes("Insufficient Funds")) {
        res.status(400).json({ success: false, error: msg });
        return;
      } else if (msg.toLowerCase().includes("wallet not found")) {
        res.status(404).json({ success: false, error: msg });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
