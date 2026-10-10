import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import { type PlacedObject, randomLayout } from './scene';

export type TrialResult = { targetName: string; seconds: number; errors: number };

export const formatSeconds = (seconds: number) => seconds.toFixed(1).replace('.', ',');

/**
 * One trial: random layout, random target, the clock starts on the first touch
 * and stops when the tester double-taps the target.
 */
export function useReadabilityTrial(speak: (text: string) => void) {
  const [layout, setLayout] = useState(randomLayout);
  const [target, setTarget] = useState<PlacedObject | null>(null);
  const [results, setResults] = useState<TrialResult[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const errorsRef = useRef(0);

  const start = () => {
    const nextLayout = randomLayout();
    const nextTarget = nextLayout[Math.floor(Math.random() * nextLayout.length)];
    setLayout(nextLayout);
    setTarget(nextTarget);
    startedAtRef.current = null;
    errorsRef.current = 0;
    speak(`Znajdź: ${nextTarget.name}. Kiedy znajdziesz, dotknij dwa razy.`);
  };

  const cancel = () => {
    setTarget(null);
    startedAtRef.current = null;
  };

  const markTouch = () => {
    if (target && startedAtRef.current === null) startedAtRef.current = Date.now();
  };

  const confirm = (object: PlacedObject | null) => {
    if (!target || startedAtRef.current === null) return;

    if (object?.id !== target.id) {
      errorsRef.current += 1;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speak(object ? `To nie jest ${target.name}.` : 'Tu nic nie ma.');
      return;
    }

    const seconds = (Date.now() - startedAtRef.current) / 1000;
    setResults((previous) => [...previous, { targetName: target.name, seconds, errors: errorsRef.current }]);
    setTarget(null);
    startedAtRef.current = null;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak(`Brawo! Czas: ${formatSeconds(seconds)} sekundy.`);
  };

  return {
    layout,
    target,
    results,
    start,
    cancel,
    markTouch,
    confirm,
    shuffleLayout: () => setLayout(randomLayout()),
  };
}
