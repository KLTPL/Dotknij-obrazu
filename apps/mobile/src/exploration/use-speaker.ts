import * as Speech from 'expo-speech';
import { useMemo, useRef } from 'react';

/** Speaks Polish text and lowers the object sound while the voice is talking. */
export function useSpeaker(setDucked: (ducked: boolean) => void) {
  const speakingRef = useRef(false);

  return useMemo(() => {
    const finished = () => {
      speakingRef.current = false;
      setDucked(false);
    };
    return {
      speak: (text: string) => {
        void Speech.stop();
        Speech.speak(text, {
          language: 'pl-PL',
          onStart: () => {
            speakingRef.current = true;
            setDucked(true);
          },
          onDone: finished,
          onStopped: finished,
          onError: finished,
        });
      },
      stop: () => {
        finished();
        void Speech.stop();
      },
      isSpeaking: () => speakingRef.current,
    };
  }, [setDucked]);
}
