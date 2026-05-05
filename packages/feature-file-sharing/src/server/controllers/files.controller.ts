import type { Request, Response } from "express";
import { filesService } from "../services/files.service";

export const filesController = {
  async list(_req: Request, res: Response) {
    try {
      const files = await filesService.listFiles();
      res.json(files);
    } catch {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const file = await filesService.getFile(req.params.id);
      if (!file) return res.status(404).json({ error: "File not found" });
      res.json(file);
    } catch {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  },

  async upload(req: Request, res: Response) {
    try {
      const multerFile = req.file;
      if (!multerFile) return res.status(400).json({ error: "No file provided" });

      // userId injected by auth middleware
      const ownerId = (req as Request & { userId?: string }).userId ?? "anonymous";

      const file = await filesService.createFile({
        name: multerFile.originalname,
        url: `/uploads/${multerFile.filename}`,
        size: multerFile.size,
        mimeType: multerFile.mimetype,
        ownerId,
      });

      // Emit realtime event if ws is attached to app
      const wss = (req.app as any).wss;
      if (wss) {
        wss.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ event: "file:uploaded", data: file }));
          }
        });
      }

      res.status(201).json(file);
    } catch {
      res.status(500).json({ error: "Upload failed" });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await filesService.deleteFile(req.params.id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete file" });
    }
  },
};
