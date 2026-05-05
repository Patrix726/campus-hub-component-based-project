import { Router } from "express";
import multer from "multer";
import path from "path";
import { filesController } from "../controllers/files.controller";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/", "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument"];
    const ok = allowed.some((t) => file.mimetype.startsWith(t));
    cb(null, ok);
  },
});

const router = Router();

router.get("/api/files", filesController.list);
router.get("/api/files/:id", filesController.getOne);
router.post("/api/files/upload", upload.single("file"), filesController.upload);
router.delete("/api/files/:id", filesController.remove);

export { router as fileRoutes };
