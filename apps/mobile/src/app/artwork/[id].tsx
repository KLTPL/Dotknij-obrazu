import type { ArtworkObject } from '@repo/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ArtworkEntry, decodeLayers, pixelIndex } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { SOUNDS } from '@/audio/sounds';
import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useScreenOrientation } from '@/exploration/use-screen-orientation';
import { useSpeaker } from '@/exploration/use-speaker';

// The farthest point of the artwork still plays at this share of full volume
const FAR_GAIN = 0.3;
const GESTURES = 'Przytrzymaj: nazwa · stuknij 2 razy: opis obiektu · dwa palce: opis obrazu';

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
  const speaker = useSpeaker(sounds.setDucked);
  const [active, setActive] = useState<ArtworkObject | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const aspectRatio = layers.width / layers.height;
  useScreenOrientation(aspectRatio > 1);

  useEffect(() => {
    speaker.speak(
      `${manifest.title}. ${manifest.author}. Wódź palcem po ekranie. ` +
        'Stuknij dwoma palcami, aby usłyszeć opis obrazu.',
    );
    return speaker.stop;
  }, [manifest, speaker]);

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
            {active ? active.shortDescription : GESTURES}
          </Text>
        </View>
      </View>

      <View style={styles.area} onLayout={(event) => setArea(event.nativeEvent.layout)}>
        {area.width > 0 && (
          <ExplorationBoard
            style={boardSize}
            accessibilityLabel={`Obraz ${manifest.title}. Aby poznawać go palcem, wstrzymaj czytnik ekranu.`}
            objectAt={(x, y) => objectsById.get(layers.objectIds[pixelIndex(layers, x, y)]) ?? null}
            isEdge={(x, y) => layers.edges[pixelIndex(layers, x, y)] > 0}
            onMove={(x, y) => {
              const depth = layers.depth[pixelIndex(layers, x, y)] ?? 0;
              sounds.setGain(FAR_GAIN + (1 - FAR_GAIN) * (depth / 255));
            }}
            onObjectChange={(object) => {
              sounds.setActive(object?.id ?? null);
              setActive(object);
            }}
            onHold={(object) => speaker.speak(object.label)}
            onDoubleTap={(object) =>
              speaker.speak(object ? `${object.label}. ${object.longDescription}` : 'Tutaj nie ma opisanego obiektu.')
            }
            onTwoFingerTap={() => (speaker.isSpeaking() ? speaker.stop() : speaker.speak(manifest.description))}
          >
            <Image source={entry.image} style={StyleSheet.absoluteFill} resizeMode="stretch" />
            {/* Every overlay stays mounted, so showing one does not wait for the image to decode */}
            {manifest.objects.map((object) => (
              <Image
                key={object.id}
                source={entry.highlights[object.id]}
                style={[StyleSheet.absoluteFill, { opacity: active?.id === object.id ? 1 : 0 }]}
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
});
