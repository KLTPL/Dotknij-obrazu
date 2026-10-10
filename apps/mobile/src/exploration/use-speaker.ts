import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * The best Polish voice of the phone's speech engine: a high-quality one if any is installed,
 * and one stored on the phone rather than streamed, so speech never waits for the network.
 */
async function bestPolishVoice(): Promise<string | undefined> {
  const voices = (await Speech.getAvailableVoicesAsync()).filter((voice) => voice.language.startsWith('pl'));
  const score = (voice: Speech.Voice) =>
    (voice.quality === Speech.VoiceQuality.Enhanced ? 2 : 0) + (voice.identifier.includes('network') ? 0 : 1);
  voices.sort((a, b) => score(b) - score(a));
  return voices[0]?.identifier;
}

/** Speaks Polish text and lowers the object sound while the voice is talking. */
export function useSpeaker(setDucked: (ducked: boolean) => void) {
  const speakingRef = useRef(false);
  const voiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Until the list arrives, and when it is empty, the engine's default Polish voice speaks
    bestPolishVoice()
      .then((voice) => {
        voiceRef.current = voice;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // A description must not keep talking from a pocket after the app is left
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void Speech.stop();
    });
    return () => appState.remove();
  }, []);

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
          voice: voiceRef.current,
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
