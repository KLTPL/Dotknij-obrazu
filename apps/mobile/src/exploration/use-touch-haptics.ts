import type { ArtworkTexture } from '@repo/shared';
import { useEffect, useMemo, useRef } from 'react';
import { Vibration } from 'react-native';

const TICK_MS = 16;
// At the edge of a contour the phone gives sparse, short pulses; in its middle they merge into a buzz
const SLOWEST_INTERVAL_MS = 160;
const FASTEST_INTERVAL_MS = 45;
const SHORTEST_PULSE_MS = 8;
const LONGEST_PULSE_MS = 24;
// Near a contour the surface texture is switched off, so the two signals never mix
const CONTOUR_PRIORITY = 0.15;

// Crossing a border: two knocks when the finger enters an object, one when it leaves for the background
const ENTER_PATTERN = [0, 30, 50, 30];
const LEAVE_PULSE_MS = 30;
// Contour and texture pulses pause for this long, because any new vibration cuts off the knocks
const BORDER_QUIET_MS = 150;

/**
 * How each surface feels: one pulse of `pulseMs` for every `spacing` points the finger travels.
 * Tied to movement, not time, like a real surface: a resting finger feels nothing.
 */
const TEXTURES: Record<ArtworkTexture, { spacing: number; pulseMs: number } | null> = {
  smooth: null,
  soft: { spacing: 30, pulseMs: 6 },
  grainy: { spacing: 12, pulseMs: 8 },
  rough: { spacing: 22, pulseMs: 18 },
};

/**
 * Vibration under the exploring finger. Crossing into an object knocks twice. Contours buzz, denser towards the line, so an outline
 * can be followed like a groove; inside an object the finger feels its texture while it moves.
 * Phones cannot vibrate at a chosen strength, so strength is rendered as pulse rate and length.
 */
export function useTouchHaptics() {
  const contourRef = useRef(0);
  const travelledRef = useRef(0);
  const quietUntilRef = useRef(0);

  useEffect(() => {
    let lastPulseAt = 0;
    const timer = setInterval(() => {
      const strength = contourRef.current;
      const now = Date.now();
      if (strength <= 0 || now < quietUntilRef.current) return;
      const interval = SLOWEST_INTERVAL_MS + (FASTEST_INTERVAL_MS - SLOWEST_INTERVAL_MS) * strength;
      if (now - lastPulseAt < interval) return;
      lastPulseAt = now;
      Vibration.vibrate(SHORTEST_PULSE_MS + (LONGEST_PULSE_MS - SHORTEST_PULSE_MS) * strength);
    }, TICK_MS);

    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, []);

  return useMemo(
    () => ({
      /** Closeness to a contour, 0..1; 0 stops the buzz. */
      setContour: (strength: number) => {
        contourRef.current = strength;
      },
      /** The finger crossed the border of an object. */
      border: (entered: boolean) => {
        quietUntilRef.current = Date.now() + BORDER_QUIET_MS;
        Vibration.vibrate(entered ? ENTER_PATTERN : LEAVE_PULSE_MS);
      },
      /** Call on every move with the distance covered since the previous one. */
      travel: (distance: number, texture: ArtworkTexture) => {
        const pattern = TEXTURES[texture];
        if (!pattern || contourRef.current > CONTOUR_PRIORITY || Date.now() < quietUntilRef.current) {
          travelledRef.current = 0;
          return;
        }
        travelledRef.current += distance;
        if (travelledRef.current >= pattern.spacing) {
          travelledRef.current = 0;
          Vibration.vibrate(pattern.pulseMs);
        }
      },
    }),
    [],
  );
}
