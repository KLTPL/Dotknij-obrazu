import type { ArtworkObject, ArtworkRole } from '@repo/shared';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScreenReader } from '@/accessibility/screen-reader';
import { type ArtworkEntry, decodeLayers, localizeManifest, objectNearness, pixelIndex } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { SOUNDS } from '@/audio/sounds';
import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useScreenOrientation } from '@/exploration/use-screen-orientation';
import { useSpeaker } from '@/exploration/use-speaker';
import { useLanguage } from '@/i18n/language';
import { COLORS, SPACING } from '@/theme';
import { Button } from '@/ui/button';

// The farthest point of the artwork still plays at this share of full loudness
const FAR_GAIN = 0.55;
// Share of full loudness under a resting finger: a dynamic object keeps sounding, so a sound that goes
// on after the finger stops means action; a static one falls silent and is heard only when stroked
const REST_LEVEL: Record<ArtworkRole, number> = { dynamic: 0.6, static: 0 };
// Soundscape: every object plays at once, the farthest at the first level, the nearest at the second
const SOUNDSCAPE_FAR = 0.3;
const SOUNDSCAPE_NEAR = 0.65;
// The soundscape returns this long after the finger lifts, so taps do not make it flicker
const SOUNDSCAPE_RETURN_MS = 1200;
// Under a screen reader the soundscape plays at this share of its level, below the reader's voice
const SOUNDSCAPE_SCREEN_READER = 0.5;
// Android's back gesture fires for a touch starting this close to a side edge, so the painting
// keeps away from it and a finger put on its edge explores instead of leaving the screen
const EDGE_GUARD = 24;
// The caption is for people watching; capped so a large font does not squeeze the painting
const CAPTION_MAX_SCALE = 1.3;

/** What was spoken last: the artwork (id 0) or an object, and whether its description or story. */
type Spoken = { id: number; part: 'description' | 'story' };

export default function ArtworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = ARTWORKS.find((artwork) => artwork.manifest.id === id);
  if (!entry) return <Redirect href="/" />;
  return <ArtworkExplorer entry={entry} />;
}

function ArtworkExplorer({ entry }: { entry: ArtworkEntry }) {
  const { language, t } = useLanguage();
  const manifest = useMemo(() => localizeManifest(entry.manifest, language), [entry, language]);
  const router = useRouter();
  const layers = useMemo(() => decodeLayers(entry), [entry]);
  const objectsById = useMemo(() => new Map(manifest.objects.map((object) => [object.id, object])), [manifest]);
  const objectSounds = useMemo(
    () => manifest.objects.map((object) => ({
        id: object.id,
        sound: SOUNDS[object.sound],
        restLevel: REST_LEVEL[object.role],
      })),
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
  const screenReader = useScreenReader();
  const ambient = useMemo(
    () =>
      screenReader
        ? new Map([...soundscape].map(([objectId, level]) => [objectId, level * SOUNDSCAPE_SCREEN_READER]))
        : soundscape,
    [screenReader, soundscape],
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
    // The screen turns by itself, but a blind user has to be told how to hold the phone.
    // Forgetting what was told before keeps a two-finger tap over the intro from taking it for the painting's text
    lastSpokenRef.current = null;
    speaker.introduce(t.artwork.intro(manifest.title, manifest.author, landscape));
    return speaker.stop;
  }, [manifest, landscape, speaker, t]);

  useFocusEffect(
    useCallback(() => {
      // The whole artwork plays whenever no finger is on it; a touch leaves only what is under the finger.
      // Another screen on top, like the details, silences it.
      sounds.setAmbient(ambient);
      return () => {
        speaker.stop();
        stopSoundscape();
      };
    }, [ambient, sounds, speaker, stopSoundscape]),
  );

  const resumeSoundscape = () => {
    if (returnRef.current) clearTimeout(returnRef.current);
    returnRef.current = setTimeout(() => sounds.setAmbient(ambient), SOUNDSCAPE_RETURN_MS);
  };

  const openDetails = () => router.push({ pathname: '/details/[id]', params: { id: manifest.id } });

  // Everything that does not need a finger on the painting, for a screen reader's actions menu
  const actions = [
    { name: 'description', label: t.gallery.actionDescription },
    ...(manifest.story ? [{ name: 'story', label: t.gallery.actionStory }] : []),
    { name: 'objects', label: t.artwork.actionObjects },
    { name: 'stop', label: t.artwork.actionStop },
  ];
  const handleAction = (name: string) => {
    // Read by the screen reader itself, in the voice and pace its user has chosen
    if (name === 'description') AccessibilityInfo.announceForAccessibility(manifest.description);
    else if (name === 'story' && manifest.story) AccessibilityInfo.announceForAccessibility(manifest.story);
    else if (name === 'objects') openDetails();
    else if (name === 'stop') speaker.stop();
  };

  const contourAt = (x: number, y: number) => (layers.contours[pixelIndex(layers, x, y)] ?? 0) / 255;

  // The largest board with the artwork's proportions that fits the free area
  const boardWidth = Math.min(area.width, area.height * aspectRatio);
  const boardSize = { width: boardWidth, height: boardWidth / aspectRatio };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden />
      <View style={styles.bar}>
        <Button label={t.artwork.back} accessibilityLabel={t.artwork.backLabel} onPress={() => router.back()} />
        <View style={styles.caption}>
          <Text style={styles.captionTitle} numberOfLines={1} maxFontSizeMultiplier={CAPTION_MAX_SCALE}>
            {active ? active.label : `${manifest.title} · ${manifest.author}`}
          </Text>
          <Text style={styles.captionText} numberOfLines={2} maxFontSizeMultiplier={CAPTION_MAX_SCALE}>
            {active ? active.shortDescription : `${landscape ? t.artwork.holdLandscape : t.artwork.holdPortrait} · ${t.artwork.gestures}`}
          </Text>
        </View>
        <Button label={t.details.open} accessibilityLabel={t.details.openLabel} onPress={openDetails} />
      </View>

      <View style={styles.area} onLayout={(event) => setArea(event.nativeEvent.layout)}>
        {area.width > 0 && (
          <ExplorationBoard
            style={boardSize}
            accessibilityLabel={t.artwork.boardLabel(manifest.title)}
            accessibilityHint={t.artwork.boardHint}
            accessibilityActions={actions}
            onAccessibilityAction={handleAction}
            exploreByHover={screenReader}
            objectAt={(x, y) => objectsById.get(layers.objectIds[pixelIndex(layers, x, y)]) ?? null}
            contourAt={contourAt}
            textureOf={(object) => object.texture}
            onTouchStart={stopSoundscape}
            onTouchEnd={resumeSoundscape}
            // A tap over the introduction means the user knows it already; a finger moving across
            // the painting, as the introduction itself asks, lets it finish
            onTap={speaker.skipIntroduction}
            onMove={(x, y, distance) => {
              sounds.stroke(distance);
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
                speaker.speak(t.artwork.nothingHere);
                return;
              }
              tell(object.id, `${object.label}. ${object.longDescription}`, object.story, t.artwork.storyHintObject);
            }}
            onTwoFingerTap={() => {
              // Only the painting's own text is stopped; the intro, which itself asks for this
              // gesture, or an object's description gives way to the painting instead
              if (speaker.isSpeaking() && lastSpokenRef.current?.id === 0) speaker.stop();
              else tell(0, manifest.description, manifest.story, t.artwork.storyHintArtwork);
            }}
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
  },
  caption: { flex: 1 },
  captionTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  captionText: { color: COLORS.textSecondary, fontSize: 13 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: EDGE_GUARD },
  // Explicit size: a bundled image otherwise keeps its own pixel size and only a corner would show
  layer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  contours: { opacity: 0.35 },
});
