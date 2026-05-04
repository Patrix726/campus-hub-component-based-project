import { auth } from "@repo/auth";
import { env } from "@repo/env/server";
import { profileRoutes } from "@repo/feature-user-profiles/server";
import { chatRoutes, registerChatRealtimeHandlers } from "@repo/feature-chat/server";
import { notificationRoutes, registerNotificationListeners } from "@repo/feature-notifications/server";
import { initRealtimeServer } from "@repo/realtime/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { createServer } from "http";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Auth handler (must be before express.json() — better-auth handles its own parsing)
app.all("/api/auth{/*path}", toNodeHandler(auth));

// Body parsing
app.use(express.json());

// Feature routes
app.use(profileRoutes);
app.use(chatRoutes);
app.use(notificationRoutes);

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

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
  console.log("WebSocket available at ws://localhost:3000/ws");
});
