"use client";

import { Card } from "@repo/ui/components/card";
import type { Payment } from "../shared";

interface PaymentStatusProps {
  payment: Payment | null;
}

export function PaymentStatus({ payment }: PaymentStatusProps) {
  if (!payment) return null;

  const isSuccess = payment.status === "success";

  return (
    <Card className={`p-4 border-2 ${isSuccess ? "border-green-500" : "border-red-500"}`}>
      <p className={`font-semibold text-lg ${isSuccess ? "text-green-600" : "text-red-600"}`}>
        {isSuccess ? "Payment Successful" : "Payment Failed"}
      </p>
      <p className="text-sm text-gray-500">
        Amount: ${payment.amount.toFixed(2)}
      </p>
      <p className="text-sm text-gray-400">
        {new Date(payment.createdAt).toLocaleString()}
      </p>
    </Card>
  );
}
