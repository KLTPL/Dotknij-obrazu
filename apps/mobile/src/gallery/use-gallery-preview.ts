import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useScreenReader } from '@/accessibility/screen-reader';
import { type ArtworkEntry, localizeManifest, teaserOf } from '@/artworks/artwork';
import { SOUNDS } from '@/audio/sounds';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useSpeaker } from '@/exploration/use-speaker';
import { useLanguage } from '@/i18n/language';
import { useSettings } from '@/settings/settings';

// The preview starts once a swipe has settled, so flicking through the paintings stays quiet
const SETTLE_MS = 700;
// Every object plays at this level; lower under a screen reader, whose voice must stay on top
const PREVIEW_LEVEL = 0.4;
const PREVIEW_LEVEL_SCREEN_READER = 0.2;
// The loops are released once their fade-out (FADE_OUT_MS in use-object-sounds) is over
const RELEASE_MS = 500;

/**
 * The "audio thumbnail" of the painting on screen: all its object sounds quietly at once and its
 * first sentence spoken. Both start when the page settles and stop when it is left or covered by
 * another screen. `entry` null is the end of the gallery.
 */
export function useGalleryPreview(entry: ArtworkEntry | null) {
  const { language, t } = useLanguage();
  const { settings } = useSettings();
  const screenReader = useScreenReader();
  const [playing, setPlaying] = useState<ArtworkEntry | null>(null);
  const objectSounds = useMemo(
    () => playing?.manifest.objects.map((object) => ({ id: object.id, sound: SOUNDS[object.sound] })) ?? [],
    [playing],
  );
  const sounds = useObjectSounds(objectSounds);
  const speaker = useSpeaker(sounds.setDucked);
  const howToSaidRef = useRef(false);

  const introduce = useCallback(() => {
    if (!entry) {
      speaker.introduce(t.gallery.endSpoken);
      return;
    }
    const manifest = localizeManifest(entry.manifest, language);
    const text = t.gallery.teaser(manifest.title, manifest.author, manifest.year, teaserOf(manifest));
    // How to move on is said with the first painting only; after that just the paintings speak
    speaker.introduce(howToSaidRef.current ? text : `${text} ${t.gallery.howTo}`);
    howToSaidRef.current = true;
  }, [entry, language, speaker, t]);

  useFocusEffect(
    useCallback(() => {
      const settle = setTimeout(() => {
        if (entry && settings.galleryPreview) {
          setPlaying(entry);
          const level = screenReader ? PREVIEW_LEVEL_SCREEN_READER : PREVIEW_LEVEL;
          sounds.setAmbient(new Map(entry.manifest.objects.map((object) => [object.id, level])));
        }
        introduce();
      }, SETTLE_MS);
      return () => {
        clearTimeout(settle);
        speaker.stop();
        sounds.setAmbient(null);
        setTimeout(() => setPlaying(null), RELEASE_MS);
      };
    }, [entry, settings.galleryPreview, screenReader, sounds, speaker, introduce]),
  );

  return { repeat: introduce };
}
