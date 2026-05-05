"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { usePayments } from "./usePayments";
import type { Payment } from "../shared";

interface PaymentButtonProps {
  amount: number;
  label?: string;
  onResult?: (payment: Payment) => void;
}

export function PaymentButton({ amount, label, onResult }: PaymentButtonProps) {
  const { makePayment } = usePayments();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    try {
      const result = await makePayment(amount);
      onResult?.(result);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Button onClick={handlePay} disabled={paying}>
      {paying ? "Processing..." : (label ?? `Pay $${amount}`)}
    </Button>
  );
}
