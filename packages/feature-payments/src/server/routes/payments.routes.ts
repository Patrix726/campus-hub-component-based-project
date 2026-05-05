import { Router } from "express";
import { paymentsController } from "../controllers/payments.controller";

const router = Router();

router.post("/api/payments/pay", paymentsController.pay);
router.get("/api/payments", paymentsController.list);

export { router as paymentRoutes };
