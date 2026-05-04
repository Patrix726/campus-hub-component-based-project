import { Router, type Router as RouterType } from "express";
import * as controller from "./controller";

const router: RouterType = Router();

router.get("/api/notifications", controller.listNotifications);
router.patch("/api/notifications/:id/read", controller.markAsRead);

export { router as notificationRoutes };
