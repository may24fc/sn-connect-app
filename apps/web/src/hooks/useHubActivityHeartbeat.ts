'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

export function useHubActivityHeartbeat(enabled = true): void {
  const lastInteractionAt = useRef(Date.now());
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const markInteraction = () => {
      lastInteractionAt.current = Date.now();
    };

    const sendHeartbeat = async () => {
      if (
        requestInFlight.current ||
        document.visibilityState !== 'visible' ||
        Date.now() - lastInteractionAt.current > ACTIVE_WINDOW_MS
      ) {
        return;
      }

      requestInFlight.current = true;
      try {
        await fetch('/api/hub-usage/heartbeat', { method: 'POST', keepalive: true });
      } catch {
        // Activity telemetry must never interrupt the signed-in experience.
      } finally {
        requestInFlight.current = false;
      }
    };

    const interactionEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, markInteraction, { passive: true });
    }

    void sendHeartbeat();
    const intervalId = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, markInteraction);
      }
    };
  }, [enabled]);
}
