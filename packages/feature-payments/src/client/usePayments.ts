import { useState, useEffect, useCallback } from "react";
import type { Payment } from "../shared";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      setPayments(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const makePayment = async (amount: number) => {
    const res = await fetch("/api/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error("Payment failed");
    const payment: Payment = await res.json();
    setPayments((prev) => [payment, ...prev]);
    return payment;
  };

  useEffect(() => { getPayments(); }, [getPayments]);

  return { payments, loading, error, makePayment, refetch: getPayments };
}
