import { EventEmitter } from "events";

/**
 * Internal server-side event bus for cross-feature communication.
 *
 * This is NOT exposed over WebSocket — it's a pure in-process EventEmitter.
 * Features emit and listen to internal events without importing each other.
 *
 * Convention: events are namespaced as "internal:<feature>:<action>"
 */
class InternalEventBus extends EventEmitter {
  /** Emit a typed internal event */
  emitInternal(event: string, payload: unknown): void {
    this.emit(event, payload);
  }

  /** Listen for a typed internal event */
  onInternal(event: string, handler: (payload: any) => void): void {
    this.on(event, handler);
  }
}

const eventBus = new InternalEventBus();

export function getEventBus(): InternalEventBus {
  return eventBus;
}
