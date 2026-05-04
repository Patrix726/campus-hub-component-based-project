import { auth } from "@repo/auth";
import { env } from "@repo/env/server";
import { commentRoutes } from "@repo/feature-comments/server";
import { postRoutes } from "@repo/feature-posts/server";
import { profileRoutes } from "@repo/feature-user-profiles/server";
import { attachRealtime } from "@repo/realtime";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { requireAuth } from "./middleware/auth";

const app = express();

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

app.use(profileRoutes);

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

const server = app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});

attachRealtime(server);
