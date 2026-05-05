"use client";

import { PaymentButton, PaymentHistory, PaymentStatus } from "@repo/feature-payments/client";
import { useState } from "react";
import type { Payment } from "@repo/feature-payments/shared";

export default function PaymentsPage() {
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <PaymentButton amount={29.99} onResult={setLastPayment} />
          <PaymentButton amount={9.99} label="Pay $9.99 (Basic)" onResult={setLastPayment} />
        </div>
        <PaymentStatus payment={lastPayment} />
        <PaymentHistory />
      </div>
    </div>
  );
}
