import { type AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';

const CUE_VOLUME = 0.5;

/**
 * Short signal played when the finger crosses the border of an object: two rising notes on
 * entering, two falling ones on leaving for the background. The loops crossfade, so without
 * it the exact moment of the change is hard to hear.
 */
export function useBorderCue() {
  const playersRef = useRef<{ enter: AudioPlayer; leave: AudioPlayer } | null>(null);

  useEffect(() => {
    const enter = createAudioPlayer(require('../../assets/cues/enter.wav'));
    const leave = createAudioPlayer(require('../../assets/cues/leave.wav'));
    enter.volume = CUE_VOLUME;
    leave.volume = CUE_VOLUME;
    playersRef.current = { enter, leave };
    return () => {
      playersRef.current = null;
      enter.release();
      leave.release();
    };
  }, []);

  return useMemo(
    () => ({
      play: (entered: boolean) => {
        const player = entered ? playersRef.current?.enter : playersRef.current?.leave;
        if (!player?.isLoaded) return;
        // Rewinding first lets the cue play again when borders follow each other quickly
        void player.seekTo(0);
        player.play();
      },
    }),
    [],
  );
}
