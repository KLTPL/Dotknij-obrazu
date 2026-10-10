import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import type { Strings } from '@/i18n/strings';

import { type PlacedObject, randomLayout } from './scene';

export type TrialResult = { targetName: string; seconds: number; errors: number };

/**
 * One trial: random layout, random target, the clock starts on the first touch
 * and stops when the tester double-taps the target.
 */
export function useReadabilityTrial(speak: (text: string) => void, t: Strings) {
  const names = t.training.objects;
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
    speak(t.training.find(names[nextTarget.id]));
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
      speak(object ? t.training.wrong(names[target.id]) : t.training.nothing);
      return;
    }

    const seconds = (Date.now() - startedAtRef.current) / 1000;
    setResults((previous) => [...previous, { targetName: names[target.id], seconds, errors: errorsRef.current }]);
    setTarget(null);
    startedAtRef.current = null;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak(t.training.bravo(t.seconds(seconds)));
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
