import { useRef } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useScreenReader } from '@/accessibility/screen-reader';
import { type ArtworkEntry, localizeManifest, teaserOf } from '@/artworks/artwork';
import { useLanguage } from '@/i18n/language';
import { COLORS, SPACING, TYPE } from '@/theme';
import { Button } from '@/ui/button';

// The same double tap as on the painting itself
const DOUBLE_TAP_MS = 350;

type Props = {
  entry: ArtworkEntry;
  height: number;
  onOpen: () => void;
  /** Says the introduction of the painting again. */
  onRepeat: () => void;
  onDetails: () => void;
};

/** One painting filling the gallery: one tap repeats its introduction, two open it for exploring. */
export function ArtworkPage({ entry, height, onOpen, onRepeat, onDetails }: Props) {
  const { language, t } = useLanguage();
  const screenReader = useScreenReader();
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manifest = localizeManifest(entry.manifest, language);
  const { title, author, year, objects, layers, description, story } = manifest;
  const teaser = teaserOf(manifest);
  const landscape = layers.width > layers.height;

  const press = () => {
    // A screen reader turns its own double tap into one press
    if (screenReader) return onOpen();
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      onOpen();
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      onRepeat();
    }, DOUBLE_TAP_MS);
  };

  // A screen reader user picks these from the actions menu instead of looking for buttons;
  // the reader's double tap itself arrives as a press and opens the painting
  const actions = [
    { name: 'description', label: t.gallery.actionDescription },
    ...(story ? [{ name: 'story', label: t.gallery.actionStory }] : []),
    { name: 'details', label: t.gallery.actionDetails },
  ];

  return (
    <View style={[styles.page, { height }]}>
      <Pressable
        style={styles.content}
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={t.gallery.pageLabel(title, author, year, teaser, objects.length, landscape)}
        accessibilityHint={t.gallery.pageHint}
        accessibilityActions={actions}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'details') onDetails();
          // Read by the screen reader itself, in the voice and pace its user has chosen
          else if (nativeEvent.actionName === 'description') AccessibilityInfo.announceForAccessibility(description);
          else if (nativeEvent.actionName === 'story' && story) AccessibilityInfo.announceForAccessibility(story);
        }}
      >
        <Image source={entry.image} style={styles.image} resizeMode="contain" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.author}>
          {author}, {year}
        </Text>
        <Text style={styles.teaser}>{teaser}</Text>
        <Text style={styles.meta}>
          {landscape ? t.gallery.landscape : t.gallery.portrait} · {t.gallery.objects(objects.length)}
        </Text>
      </Pressable>
      {/* For people looking at the screen; a screen reader opens the painting from the page itself */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Button primary label={t.gallery.explore} onPress={onOpen} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: SPACING.l, paddingBottom: SPACING.l },
  content: { flex: 1, gap: SPACING.xs },
  image: { flex: 1, width: '100%', marginBottom: SPACING.m },
  title: { ...TYPE.title, color: COLORS.text },
  author: { ...TYPE.body, color: COLORS.textSecondary },
  teaser: { ...TYPE.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  meta: { ...TYPE.small, color: COLORS.accent, fontWeight: '600', marginVertical: SPACING.s },
});
