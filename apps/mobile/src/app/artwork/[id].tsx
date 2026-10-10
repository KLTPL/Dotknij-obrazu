import type { ArtworkObject } from '@repo/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ArtworkEntry, decodeLayers, objectNearness, pixelIndex } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { SOUNDS } from '@/audio/sounds';
import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useScreenOrientation } from '@/exploration/use-screen-orientation';
import { useSpeaker } from '@/exploration/use-speaker';

// The farthest point of the artwork still plays at this share of full loudness
const FAR_GAIN = 0.55;
// Soundscape: every object plays at once, the farthest at the first level, the nearest at the second
const SOUNDSCAPE_FAR = 0.3;
const SOUNDSCAPE_NEAR = 0.65;
// The soundscape returns this long after the finger lifts, so taps do not make it flicker
const SOUNDSCAPE_RETURN_MS = 1200;
const GESTURES = 'Stuknij 2 razy: nazwa i opis obiektu · dwa palce: opis obrazu';
const HOLD_LANDSCAPE = '↻ Trzymaj telefon poziomo';
const HOLD_PORTRAIT = 'Trzymaj telefon pionowo';
const STORY_HINT_OBJECT = 'Stuknij dwa razy jeszcze raz, aby usłyszeć historię.';
const STORY_HINT_ARTWORK = 'Stuknij dwoma palcami jeszcze raz, aby usłyszeć historię obrazu.';

/** What was spoken last: the artwork (id 0) or an object, and whether its description or story. */
type Spoken = { id: number; part: 'description' | 'story' };

export default function ArtworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = ARTWORKS.find((artwork) => artwork.manifest.id === id);
  if (!entry) return <Redirect href="/" />;
  return <ArtworkExplorer entry={entry} />;
}

function ArtworkExplorer({ entry }: { entry: ArtworkEntry }) {
  const { manifest } = entry;
  const router = useRouter();
  const layers = useMemo(() => decodeLayers(entry), [entry]);
  const objectsById = useMemo(() => new Map(manifest.objects.map((object) => [object.id, object])), [manifest]);
  const objectSounds = useMemo(
    () => manifest.objects.map((object) => ({ id: object.id, sound: SOUNDS[object.sound] })),
    [manifest],
  );
  const sounds = useObjectSounds(objectSounds);
  const soundscape = useMemo(
    () =>
      new Map(
        [...objectNearness(layers)].map(([objectId, nearness]) => [
          objectId,
          SOUNDSCAPE_FAR + (SOUNDSCAPE_NEAR - SOUNDSCAPE_FAR) * nearness,
        ]),
      ),
    [layers],
  );
  const returnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSoundscape = useCallback(() => {
    if (returnRef.current) clearTimeout(returnRef.current);
    sounds.setAmbient(null);
  }, [sounds]);
  const speaker = useSpeaker(sounds.setDucked);
  const lastSpokenRef = useRef<Spoken | null>(null);
  // The description comes first; the story only when asked for right after it, so it never surprises
  const tell = (id: number, description: string, story: string | undefined, hint: string) => {
    const last = lastSpokenRef.current;
    if (story && last?.id === id && last.part === 'description') {
      lastSpokenRef.current = { id, part: 'story' };
      speaker.speak(story);
    } else {
      lastSpokenRef.current = { id, part: 'description' };
      speaker.speak(story ? `${description} ${hint}` : description);
    }
  };
  const [active, setActive] = useState<ArtworkObject | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const aspectRatio = layers.width / layers.height;
  const landscape = aspectRatio > 1;
  useScreenOrientation(landscape);

  useEffect(() => {
    // The screen turns by itself, but a blind user has to be told how to hold the phone
    const hold = landscape ? 'Obraz poziomy. Obróć telefon poziomo.' : 'Obraz pionowy. Trzymaj telefon pionowo.';
    // The whole artwork plays whenever no finger is on it; a touch leaves only what is under the finger
    sounds.setAmbient(soundscape);
    speaker.speak(
      `${manifest.title}. ${manifest.author}. ${hold} Słyszysz wszystkie dźwięki obrazu naraz. ` +
        'Wódź palcem po ekranie, aby je rozdzielić. Stuknij dwa razy, aby usłyszeć, czego dotykasz. ' +
        'Stuknij dwoma palcami, aby usłyszeć opis obrazu.',
    );
    return () => {
      speaker.stop();
      stopSoundscape();
    };
  }, [manifest, landscape, speaker, sounds, soundscape, stopSoundscape]);

  const resumeSoundscape = () => {
    if (returnRef.current) clearTimeout(returnRef.current);
    returnRef.current = setTimeout(() => sounds.setAmbient(soundscape), SOUNDSCAPE_RETURN_MS);
  };

  const contourAt = (x: number, y: number) => (layers.contours[pixelIndex(layers, x, y)] ?? 0) / 255;

  // The largest board with the artwork's proportions that fits the free area
  const boardWidth = Math.min(area.width, area.height * aspectRatio);
  const boardSize = { width: boardWidth, height: boardWidth / aspectRatio };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden />
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Wróć do galerii"
        >
          <Text style={styles.backText}>‹ Galeria</Text>
        </Pressable>
        <View style={styles.caption}>
          <Text style={styles.captionTitle} numberOfLines={1}>
            {active ? active.label : `${manifest.title} · ${manifest.author}`}
          </Text>
          <Text style={styles.captionText} numberOfLines={1}>
            {active ? active.shortDescription : `${landscape ? HOLD_LANDSCAPE : HOLD_PORTRAIT} · ${GESTURES}`}
          </Text>
        </View>
      </View>

      <View style={styles.area} onLayout={(event) => setArea(event.nativeEvent.layout)}>
        {area.width > 0 && (
          <ExplorationBoard
            style={boardSize}
            accessibilityLabel={`Obraz ${manifest.title}. Aby poznawać go palcem, wstrzymaj czytnik ekranu.`}
            objectAt={(x, y) => objectsById.get(layers.objectIds[pixelIndex(layers, x, y)]) ?? null}
            contourAt={contourAt}
            textureOf={(object) => object.texture}
            onTouchStart={stopSoundscape}
            onTouchEnd={resumeSoundscape}
            onMove={(x, y) => {
              const depth = layers.depth[pixelIndex(layers, x, y)] ?? 0;
              sounds.setGain(FAR_GAIN + (1 - FAR_GAIN) * (depth / 255));
            }}
            onObjectChange={(object) => {
              sounds.setActive(object?.id ?? null);
              setActive(object);
            }}
            onDoubleTap={(object) => {
              if (!object) {
                lastSpokenRef.current = null;
                speaker.speak('Tutaj nie ma opisanego obiektu.');
                return;
              }
              tell(object.id, `${object.label}. ${object.longDescription}`, object.story, STORY_HINT_OBJECT);
            }}
            onTwoFingerTap={() =>
              speaker.isSpeaking()
                ? speaker.stop()
                : tell(0, manifest.description, manifest.story, STORY_HINT_ARTWORK)
            }
          >
            <Image source={entry.image} style={styles.layer} resizeMode="stretch" />
            {/* Faint lines show the audience which contours the finger can feel */}
            <Image source={entry.contours} style={[styles.layer, styles.contours]} resizeMode="stretch" />
            {/* Every overlay stays mounted, so showing one does not wait for the image to decode */}
            {manifest.objects.map((object) => (
              <Image
                key={object.id}
                source={entry.highlights[object.id]}
                style={[styles.layer, { opacity: active?.id === object.id ? 1 : 0 }]}
                resizeMode="stretch"
              />
            ))}
          </ExplorationBoard>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 52 },
  back: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#222' },
  backText: { color: '#fff', fontSize: 16 },
  caption: { flex: 1 },
  captionTitle: { color: '#ffd60a', fontSize: 18, fontWeight: '700' },
  captionText: { color: '#e0e0e0', fontSize: 13 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Explicit size: a bundled image otherwise keeps its own pixel size and only a corner would show
  layer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  contours: { opacity: 0.35 },
});
