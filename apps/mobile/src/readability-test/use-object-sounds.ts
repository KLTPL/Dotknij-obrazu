import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';

import type { ObjectId, SceneObject } from './scene';

const FADE_MS = 90;
const TICK_MS = 15;
const DUCKED_VOLUME = 0.25;

type Voice = { player: AudioPlayer; volume: number; started: boolean };

/**
 * Keeps every object's loop running at volume 0 and fades the active one in.
 * Starting playback on touch would add audible latency; a volume change is instant.
 */
export function useObjectSounds(objects: readonly SceneObject[]) {
  const activeRef = useRef<ObjectId | null>(null);
  const duckedRef = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });

    const voices = new Map<ObjectId, Voice>(
      objects.map((object) => {
        const player = createAudioPlayer(object.sound);
        player.loop = true;
        player.volume = 0;
        return [object.id, { player, volume: 0, started: false }];
      }),
    );

    const step = TICK_MS / FADE_MS;
    const timer = setInterval(() => {
      voices.forEach((voice, id) => {
        if (!voice.started && voice.player.isLoaded) {
          voice.player.play();
          voice.started = true;
        }
        const target = id === activeRef.current ? (duckedRef.current ? DUCKED_VOLUME : 1) : 0;
        if (voice.volume === target) return;
        voice.volume =
          voice.volume < target ? Math.min(target, voice.volume + step) : Math.max(target, voice.volume - step);
        voice.player.volume = voice.volume;
      });
    }, TICK_MS);

    return () => {
      clearInterval(timer);
      voices.forEach((voice) => voice.player.remove());
    };
  }, [objects]);

  return useMemo(
    () => ({
      setActive: (id: ObjectId | null) => {
        activeRef.current = id;
      },
      setDucked: (ducked: boolean) => {
        duckedRef.current = ducked;
      },
    }),
    [],
  );
}
