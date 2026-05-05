import { Router, type Router as RouterType } from "express";
import * as controller from "./controller";

const router: RouterType = Router();

router.get("/api/chat", controller.listChats);
router.post("/api/chat", controller.createChat);
router.get("/api/chat/:id/messages", controller.getMessages);
router.post("/api/chat/:id/messages", controller.sendMessage);

export { router as chatRoutes };
