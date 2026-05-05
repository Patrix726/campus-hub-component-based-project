import { createPrismaClient } from "@repo/db";

const prisma = createPrismaClient();

function simulatePayment(): "success" | "failed" {
  // 80% success rate
  return Math.random() < 0.8 ? "success" : "failed";
}

export const paymentsService = {
  async makePayment(userId: string, amount: number) {
    const status = simulatePayment();
    return prisma.payment.create({
      data: { userId, amount, status },
    });
  },

  async listPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },
};
