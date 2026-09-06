import { Router } from "express";
import { TransactionController } from "../../transaction-service/controllers/transaction.controller";
import { idempotencyMiddleware } from "../../shared/middlewares/idempotency.middleware";

const transactionRouter: Router = Router();

const transactionController = new TransactionController();

transactionRouter.post(
  "/transfer",
  idempotencyMiddleware,
  transactionController.transfer.bind(transactionController),
);

transactionRouter.get(
  "/history/:userId",
  transactionController.getHistory.bind(transactionController),
);

transactionRouter.get(
  "/:transactionId",
  transactionController.getTransaction.bind(transactionController),
);

export default transactionRouter;
