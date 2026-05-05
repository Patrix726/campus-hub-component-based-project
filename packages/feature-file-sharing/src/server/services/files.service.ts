import { createPrismaClient } from "@repo/db";

const prisma = createPrismaClient();

export const filesService = {
  async listFiles() {
    return prisma.file.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getFile(id: string) {
    return prisma.file.findUnique({ where: { id } });
  },

  async createFile(data: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
    ownerId: string;
  }) {
    return prisma.file.create({ data });
  },

  async deleteFile(id: string) {
    return prisma.file.delete({ where: { id } });
  },
};
