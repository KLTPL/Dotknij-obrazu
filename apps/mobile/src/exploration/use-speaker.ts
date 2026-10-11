import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useScreenReader } from '@/accessibility/screen-reader';
import { useLanguage } from '@/i18n/language';

/**
 * The best voice of the phone's speech engine for a language ('pl', 'en'): a high-quality one
 * if any is installed, and one stored on the phone rather than streamed, so speech never
 * waits for the network.
 */
async function bestVoice(language: string): Promise<string | undefined> {
  const voices = (await Speech.getAvailableVoicesAsync()).filter((voice) => voice.language.startsWith(language));
  const score = (voice: Speech.Voice) =>
    (voice.quality === Speech.VoiceQuality.Enhanced ? 2 : 0) + (voice.identifier.includes('network') ? 0 : 1);
  voices.sort((a, b) => score(b) - score(a));
  return voices[0]?.identifier;
}

// The phone has one voice for the whole app, so stopping it stops every screen. A new screen
// introduces itself before the old one learns it was left, so only the last speaker may stop it.
let lastSpeaker: object | null = null;

/** Speaks text in the chosen language and lowers the object sound while the voice is talking. */
export function useSpeaker(setDucked: (ducked: boolean) => void) {
  const { language, t } = useLanguage();
  const screenReader = useScreenReader();
  const speakingRef = useRef(false);
  // Whether the last thing this speaker said was an introduction, which the user may cut short
  const introducingRef = useRef(false);
  const voiceRef = useRef<string | undefined>(undefined);
  // Identifies this speaker as the lastSpeaker
  const [self] = useState(() => ({}));

  useEffect(() => {
    // Until the list arrives, and when it is empty, the engine's default voice for the language speaks
    voiceRef.current = undefined;
    bestVoice(language)
      .then((voice) => {
        voiceRef.current = voice;
      })
      .catch(() => {});
  }, [language]);

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
    const speak = (text: string) => {
      introducingRef.current = false;
      void Speech.stop();
      lastSpeaker = self;
      Speech.speak(text, {
        language: t.locale,
        voice: voiceRef.current,
        onStart: () => {
          speakingRef.current = true;
          setDucked(true);
        },
        onDone: finished,
        onStopped: finished,
        onError: finished,
      });
    };
    const stop = () => {
      introducingRef.current = false;
      finished();
      // Leaving the gallery must not cut off the painting that has just started its introduction
      if (lastSpeaker !== self) return;
      lastSpeaker = null;
      void Speech.stop();
    };
    return {
      /** Speech the user asked for with a gesture. */
      speak,
      /**
       * Speech the user did not ask for, like a screen's introduction. A running screen reader
       * already reads the screen from its labels, so two voices would talk over each other.
       */
      introduce: (text: string) => {
        if (screenReader) return;
        speak(text);
        introducingRef.current = true;
      },
      /** Stops an introduction the user no longer needs; speech they asked for keeps going. */
      skipIntroduction: () => {
        if (introducingRef.current) stop();
      },
      stop,
      isSpeaking: () => speakingRef.current,
    };
  }, [setDucked, t.locale, screenReader, self]);
}
