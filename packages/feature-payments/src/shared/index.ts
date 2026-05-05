export type Payment = {
  id: string;
  userId: string;
  amount: number;
  status: "success" | "failed";
  createdAt: Date;
};

export type MakePaymentInput = {
  amount: number;
};

export type MakePaymentResponse = Payment;
export type ListPaymentsResponse = Payment[];
