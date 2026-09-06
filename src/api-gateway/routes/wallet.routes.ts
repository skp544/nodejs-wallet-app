import { Router } from "express";
import { WalletController } from "../../wallet-service/controllers/wallet.controller";
import { idempotencyMiddleware } from "../../shared/middlewares/idempotency.middleware";

const walletRouter: Router = Router();

const walletController = new WalletController();

walletRouter.post("/", walletController.createWallet.bind(walletController));

walletRouter.get("/:userId", walletController.getWallet.bind(walletController));

walletRouter.post(
  "/:userId/add-money",
  idempotencyMiddleware,
  walletController.addMoney.bind(walletController),
);

export default walletRouter;
