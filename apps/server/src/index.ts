import { auth } from "@repo/auth";
import { env } from "@repo/env/server";
import { commentRoutes } from "@repo/feature-comments/server";
import {
  chatRoutes,
  registerChatRealtimeHandlers,
} from "@repo/feature-chat/server";
import {
  notificationRoutes,
  registerNotificationListeners,
} from "@repo/feature-notifications/server";
import { postRoutes } from "@repo/feature-posts/server";
import { fileRoutes } from "@repo/feature-file-sharing/server";
import { paymentRoutes } from "@repo/feature-payments/server";
import { profileRoutes } from "@repo/feature-user-profiles/server";
import { initRealtimeServer } from "@repo/realtime/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { mkdirSync } from "fs";
import { requireAuth } from "./middleware/auth";

const app = express();

// Ensure uploads directory exists
mkdirSync("uploads", { recursive: true });
app.use("/uploads", express.static("uploads"));

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Parse JSON bodies before any route handlers run
app.use(express.json());

app.all("/api/auth{/*path}", toNodeHandler(auth));

// Feature routes
app.use(profileRoutes);
app.use(chatRoutes);
app.use(notificationRoutes);
app.use(fileRoutes);
app.use(paymentRoutes);

// Apply requireAuth middleware to all mutating routes before the feature routers handle them
app.post("/api/posts", requireAuth);
app.delete("/api/posts/:postId", requireAuth);
app.post("/api/posts/:postId/like", requireAuth);
app.delete("/api/posts/:postId/like", requireAuth);
app.post("/api/posts/:postId/comments", requireAuth);
app.delete("/api/posts/:postId/comments/:commentId", requireAuth);

app.use(postRoutes);
app.use(commentRoutes);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Create HTTP server and attach WebSocket
const server = createServer(app);

// Initialize the shared realtime system
initRealtimeServer(server);

// Register feature-specific realtime handlers
registerChatRealtimeHandlers();
registerNotificationListeners();

server.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
  console.log("WebSocket available at ws://localhost:3001/ws");
});
