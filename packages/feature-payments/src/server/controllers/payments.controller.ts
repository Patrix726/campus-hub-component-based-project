import type { Request, Response } from "express";
import { paymentsService } from "../services/payments.service";

type AuthRequest = Request & { userId?: string };

export const paymentsController = {
  async pay(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId ?? "anonymous";
      const amount = Number(req.body.amount);

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const payment = await paymentsService.makePayment(userId, amount);

      // Emit realtime event if ws is attached to app
      const wss = (req.app as any).wss;
      if (wss) {
        wss.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ event: "payment:completed", data: payment }));
          }
        });
      }

      res.status(201).json(payment);
    } catch {
      res.status(500).json({ error: "Payment processing failed" });
    }
  },

  async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId ?? "anonymous";
      const payments = await paymentsService.listPayments(userId);
      res.json(payments);
    } catch {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  },
};
