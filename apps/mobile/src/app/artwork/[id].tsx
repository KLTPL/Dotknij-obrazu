import type { ArtworkObject } from '@repo/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ArtworkEntry, contourOwner, decodeLayers, objectNearness, pixelIndex } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { SOUNDS } from '@/audio/sounds';
import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useScreenOrientation } from '@/exploration/use-screen-orientation';
import { useSpeaker } from '@/exploration/use-speaker';

// The farthest point of the artwork still plays at this share of full loudness
const FAR_GAIN = 0.55;
// Resting the finger this close to the middle of a contour names the outline instead of the object
const ON_CONTOUR = 0.35;
// Soundscape: every object plays at once, the farthest at the first level, the nearest at the second
const SOUNDSCAPE_FAR = 0.3;
const SOUNDSCAPE_NEAR = 0.65;
// After the voice stops, the soundscape stays this long at full loudness and then fades away
const SOUNDSCAPE_TAIL_MS = 5000;
const GESTURES = 'Przytrzymaj: nazwa · stuknij 2 razy: opis obiektu · dwa palce: opis obrazu';
const HOLD_LANDSCAPE = '↻ Trzymaj telefon poziomo';
const HOLD_PORTRAIT = 'Trzymaj telefon pionowo';

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
  const tailRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSoundscape = useCallback(() => {
    if (tailRef.current) clearTimeout(tailRef.current);
    sounds.setAmbient(null);
  }, [sounds]);
  const handleSpeaking = useCallback(
    (speaking: boolean) => {
      sounds.setDucked(speaking);
      if (tailRef.current) clearTimeout(tailRef.current);
      if (!speaking) tailRef.current = setTimeout(() => sounds.setAmbient(null), SOUNDSCAPE_TAIL_MS);
    },
    [sounds],
  );
  const speaker = useSpeaker(handleSpeaking);
  const [active, setActive] = useState<ArtworkObject | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const aspectRatio = layers.width / layers.height;
  const landscape = aspectRatio > 1;
  useScreenOrientation(landscape);

  useEffect(() => {
    // The screen turns by itself, but a blind user has to be told how to hold the phone
    const hold = landscape ? 'Obraz poziomy. Obróć telefon poziomo.' : 'Obraz pionowy. Trzymaj telefon pionowo.';
    // The whole artwork is heard first, under the introduction; the first touch takes it apart
    sounds.setAmbient(soundscape);
    speaker.speak(
      `${manifest.title}. ${manifest.author}. ${hold} Słyszysz wszystkie dźwięki obrazu naraz. ` +
        'Wódź palcem po ekranie, aby je rozdzielić. Stuknij dwoma palcami, aby usłyszeć opis obrazu.',
    );
    return () => {
      speaker.stop();
      stopSoundscape();
    };
  }, [manifest, landscape, speaker, sounds, soundscape, stopSoundscape]);

  const describeArtwork = () => {
    if (speaker.isSpeaking()) {
      speaker.stop();
      stopSoundscape();
    } else {
      sounds.setAmbient(soundscape);
      speaker.speak(manifest.description);
    }
  };

  const contourAt = (x: number, y: number) => (layers.contours[pixelIndex(layers, x, y)] ?? 0) / 255;

  const nameWhatIsHeld = (object: ArtworkObject | null, x: number, y: number) => {
    if (contourAt(x, y) >= ON_CONTOUR) {
      const owner = objectsById.get(contourOwner(layers, x, y));
      speaker.speak(owner ? `Obrys: ${owner.label}` : 'Obrys elementu w tle');
    } else if (object) {
      speaker.speak(object.label);
    }
  };

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
            onMove={(x, y) => {
              const depth = layers.depth[pixelIndex(layers, x, y)] ?? 0;
              sounds.setGain(FAR_GAIN + (1 - FAR_GAIN) * (depth / 255));
            }}
            onObjectChange={(object) => {
              sounds.setActive(object?.id ?? null);
              setActive(object);
            }}
            onHold={nameWhatIsHeld}
            onDoubleTap={(object) =>
              speaker.speak(object ? `${object.label}. ${object.longDescription}` : 'Tutaj nie ma opisanego obiektu.')
            }
            onTwoFingerTap={describeArtwork}
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
