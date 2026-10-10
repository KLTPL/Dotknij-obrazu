import * as Speech from 'expo-speech';
import { useCallback } from 'react';

/** Speaks Polish text and lowers the object sound while the voice is talking. */
export function useSpeaker(setDucked: (ducked: boolean) => void) {
  return useCallback(
    (text: string) => {
      void Speech.stop();
      Speech.speak(text, {
        language: 'pl-PL',
        onStart: () => setDucked(true),
        onDone: () => setDucked(false),
        onStopped: () => setDucked(false),
        onError: () => setDucked(false),
      });
    },
    [setDucked],
  );
}
