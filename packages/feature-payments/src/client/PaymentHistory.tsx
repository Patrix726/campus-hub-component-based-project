"use client";

import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { usePayments } from "./usePayments";

export function PaymentHistory() {
  const { payments, loading, error } = usePayments();

  if (loading) {
    return (
      <Card className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </Card>
    );
  }

  if (error) return <div className="text-red-500">Error: {error}</div>;

  if (payments.length === 0) {
    return <Card className="p-6 text-gray-500">No payments yet.</Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Payment History</h2>
      <ul className="space-y-3">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <p className="font-medium">${p.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-400">
                {new Date(p.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`text-sm font-semibold px-2 py-1 rounded ${
                p.status === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {p.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
