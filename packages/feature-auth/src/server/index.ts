import { auth } from "@repo/auth";
import { toNodeHandler } from "better-auth/node";

export const authRoutes = {
  path: "/api/auth",
  handler: toNodeHandler(auth),
};