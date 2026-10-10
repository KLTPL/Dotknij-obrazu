import { useEffect, useMemo, useRef } from 'react';
import { Vibration } from 'react-native';

const TICK_MS = 16;
// At the edge of a contour the phone gives sparse, short pulses; in its middle they merge into a buzz
const SLOWEST_INTERVAL_MS = 160;
const FASTEST_INTERVAL_MS = 45;
const SHORTEST_PULSE_MS = 8;
const LONGEST_PULSE_MS = 24;

/**
 * Turns closeness to a contour (0..1) into vibration, so a finger can follow an outline
 * like a groove: the pulses get denser towards the line and stop when the finger leaves it.
 * Phones cannot vibrate at a chosen strength, so strength is rendered as pulse rate and length.
 */
export function useContourHaptics() {
  const strengthRef = useRef(0);

  useEffect(() => {
    let lastPulseAt = 0;
    const timer = setInterval(() => {
      const strength = strengthRef.current;
      if (strength <= 0) return;
      const interval = SLOWEST_INTERVAL_MS + (FASTEST_INTERVAL_MS - SLOWEST_INTERVAL_MS) * strength;
      const now = Date.now();
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
      setStrength: (strength: number) => {
        strengthRef.current = strength;
      },
    }),
    [],
  );
}
