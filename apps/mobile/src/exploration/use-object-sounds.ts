import { type AudioPlayer, type AudioSource, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

// A quick fade-in keeps the sound in step with the finger; the slow fade-out lets the previous
// object linger underneath, so crossing a border sounds like a blend instead of a switch
const FADE_IN_MS = 140;
const FADE_OUT_MS = 420;
const TICK_MS = 15;
const DUCKED_LEVEL = 0.45;

export type ObjectSound<Id> = { id: Id; sound: AudioSource };

/** `level` moves linearly between 0 and 1; the player gets its square, which the ear hears as an even ramp. */
type Voice = { player: AudioPlayer; level: number; started: boolean };

/**
 * Keeps every object's loop running at volume 0 and crossfades to the active one.
 * The loops can also play together quietly, as the soundscape of the whole artwork.
 * Starting playback on touch would add audible latency; a volume change is instant.
 */
export function useObjectSounds<Id extends string | number>(objects: readonly ObjectSound<Id>[]) {
  const activeRef = useRef<Id | null>(null);
  const gainRef = useRef(1);
  const duckedRef = useRef(false);
  const ambientRef = useRef<ReadonlyMap<Id, number> | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });

    const voices = new Map<Id, Voice>(
      objects.map((object) => {
        const player = createAudioPlayer(object.sound);
        player.loop = true;
        player.volume = 0;
        return [object.id, { player, level: 0, started: false }];
      }),
    );

    const timer = setInterval(() => {
      voices.forEach((voice, id) => {
        if (!voice.started && voice.player.isLoaded && AppState.currentState === 'active') {
          voice.player.play();
          voice.started = true;
        }
        const level = id === activeRef.current ? gainRef.current : (ambientRef.current?.get(id) ?? 0);
        const target = level * (duckedRef.current ? DUCKED_LEVEL : 1);
        if (voice.level === target) return;
        voice.level =
          voice.level < target
            ? Math.min(target, voice.level + TICK_MS / FADE_IN_MS)
            : Math.max(target, voice.level - TICK_MS / FADE_OUT_MS);
        voice.player.volume = voice.level ** 2;
      });
    }, TICK_MS);

    // The loops never stop by themselves, so they are paused when the app is left or the screen turns off
    const appState = AppState.addEventListener('change', (state) => {
      voices.forEach((voice) => {
        if (!voice.started) return;
        if (state === 'active') voice.player.play();
        else voice.player.pause();
      });
    });

    return () => {
      clearInterval(timer);
      appState.remove();
      voices.forEach((voice) => voice.player.remove());
    };
  }, [objects]);

  return useMemo(
    () => ({
      setActive: (id: Id | null) => {
        activeRef.current = id;
      },
      /** Loudness of the active object, 0..1; used to make closer things louder. */
      setGain: (gain: number) => {
        gainRef.current = gain;
      },
      /** Levels (0..1) at which the objects not under the finger play together; null silences them. */
      setAmbient: (levels: ReadonlyMap<Id, number> | null) => {
        ambientRef.current = levels;
      },
      setDucked: (ducked: boolean) => {
        duckedRef.current = ducked;
      },
    }),
    [],
  );
}
