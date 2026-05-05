import { getEventBus } from "@repo/realtime/server";
import * as notificationService from "./services";

/**
 * Register notification event listeners on the internal event bus.
 *
 * This is the CRITICAL integration point — no cross-feature imports.
 * Chat (or any future feature) emits "internal:notification:create"
 * via the shared in-process event bus. This listener picks it up,
 * persists the notification, and pushes it to the user over WebSocket.
 *
 * The event bus is purely in-process — never exposed over the network.
 */
export function registerNotificationListeners() {
  const bus = getEventBus();

  bus.onInternal("internal:notification:create", async (payload: {
    userId: string;
    type: string;
    data: Record<string, unknown>;
  }) => {
    try {
      await notificationService.createNotification(
        payload.userId,
        payload.type,
        payload.data,
      );
    } catch (err) {
      console.error("Failed to create notification from event bus:", err);
    }
  });
}
