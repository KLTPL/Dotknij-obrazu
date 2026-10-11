import { type AudioPlayer, type AudioSource, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

// A quick fade-in keeps the sound in step with the finger; the slow fade-out lets the previous
// object linger underneath, so crossing a border sounds like a blend instead of a switch
const FADE_IN_MS = 140;
const FADE_OUT_MS = 420;
const TICK_MS = 15;
const DUCKED_LEVEL = 0.45;
// Finger speed, in points per second, at which a sound reaches its full loudness. Low, so any
// ordinary stroke plays at full: the sound tells what is under the finger, and the finger already
// feels its own speed. Only a crawl stays quieter, which softens the jitter of a resting finger.
const FULL_SPEED = 20;
// The sound of a stroke lingers this long after the finger stops
const MOTION_FADE_MS = 250;
const MOTION_DECAY = Math.exp(-TICK_MS / MOTION_FADE_MS);
// A steady stroke at FULL_SPEED adds as much motion as the decay takes away
const FULL_STROKE = (FULL_SPEED * MOTION_FADE_MS) / 1000;
const SILENT_MOTION = 0.01;

export type ObjectSound<Id> = {
  id: Id;
  sound: AudioSource;
  /**
   * Share of full loudness (0..1) at which the object plays under a resting finger; moving the
   * finger brings it up to full. 0 makes it sound only when stroked. Without it motion changes nothing.
   */
  restLevel?: number;
};

/** `level` moves linearly between 0 and 1; the player gets its square, which the ear hears as an even ramp. */
type Voice = { player: AudioPlayer; level: number; started: boolean; restLevel: number };

/**
 * Keeps every object's loop running at volume 0 and crossfades to the active one.
 * The loops can also play together quietly, as the soundscape of the whole artwork.
 * The active loop follows the finger's movement: louder when stroked, down to its rest level when still.
 * Starting playback on touch would add audible latency; a volume change is instant.
 */
export function useObjectSounds<Id extends string | number>(objects: readonly ObjectSound<Id>[]) {
  const activeRef = useRef<Id | null>(null);
  const gainRef = useRef(1);
  // How much the finger has been moving lately, 0 (resting) to 1 (FULL_SPEED or faster)
  const motionRef = useRef(0);
  const duckedRef = useRef(false);
  const ambientRef = useRef<ReadonlyMap<Id, number> | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });

    const voices = new Map<Id, Voice>(
      objects.map((object) => {
        const player = createAudioPlayer(object.sound);
        player.loop = true;
        player.volume = 0;
        return [object.id, { player, level: 0, started: false, restLevel: object.restLevel ?? 1 }];
      }),
    );

    const timer = setInterval(() => {
      motionRef.current *= MOTION_DECAY;
      // Exponential decay never reaches zero, and a static object has to fall fully silent
      if (motionRef.current < SILENT_MOTION) motionRef.current = 0;
      voices.forEach((voice, id) => {
        if (!voice.started && voice.player.isLoaded && AppState.currentState === 'active') {
          voice.player.play();
          voice.started = true;
        }
        const level =
          id === activeRef.current
            ? gainRef.current * (voice.restLevel + (1 - voice.restLevel) * motionRef.current)
            : (ambientRef.current?.get(id) ?? 0);
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
      // On Android remove() only forgets the player and its loop would play on forever,
      // so the player is stopped and its native resources are released explicitly
      voices.forEach((voice) => {
        voice.player.pause();
        voice.player.release();
      });
    };
  }, [objects]);

  return useMemo(
    () => ({
      setActive: (id: Id | null) => {
        // Entering an object counts as a stroke, so a finger put down on a static object hears it once
        // instead of landing in the same silence as the background
        if (id !== null && id !== activeRef.current) motionRef.current = 1;
        activeRef.current = id;
      },
      /** Call on every move with the distance the finger covered, in points. */
      stroke: (distance: number) => {
        motionRef.current = Math.min(1, motionRef.current + distance / FULL_STROKE);
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
