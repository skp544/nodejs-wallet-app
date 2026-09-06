import { Router } from "express";
import { WalletController } from "../../wallet-service/controllers/wallet.controller";

const walletRouter: Router = Router();

const walletController = new WalletController();

walletRouter.post("/", walletController.createWallet.bind(walletController));

walletRouter.get("/:userId", walletController.getWallet.bind(walletController));

walletRouter.post(
  "/:userId/add-money",
  walletController.addMoney.bind(walletController),
);

export default walletRouter;
