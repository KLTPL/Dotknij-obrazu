import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ArtworkEntry } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { ArtworkPage } from '@/gallery/artwork-page';
import { useGalleryPreview } from '@/gallery/use-gallery-preview';
import { Welcome } from '@/gallery/welcome';
import { useLanguage } from '@/i18n/language';
import { useSettings } from '@/settings/settings';
import { COLORS, SPACING, TYPE } from '@/theme';
import { Button } from '@/ui/button';

// A page counts as the current one once most of it is on screen
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

export default function GalleryScreen() {
  const { settings } = useSettings();
  return settings.onboarded ? <Gallery /> : <Welcome />;
}

/**
 * One painting per screen, changed with a vertical swipe. The painting on screen introduces
 * itself with its sounds and first sentence, so the gallery can be browsed without looking.
 */
function Gallery() {
  const router = useRouter();
  const { t } = useLanguage();
  const listRef = useRef<FlatList<ArtworkEntry>>(null);
  const [height, setHeight] = useState(0);
  // Null while the end of the gallery is on screen
  const [page, setPage] = useState<number | null>(0);
  const preview = useGalleryPreview(page === null ? null : ARTWORKS[page]);
  // FlatList requires a callback that never changes
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ArtworkEntry>[] }) =>
        setPage(viewableItems[0]?.index ?? null),
  );

  const open = (entry: ArtworkEntry) =>
    router.push({ pathname: '/artwork/[id]', params: { id: entry.manifest.id } });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Text style={styles.heading} accessibilityRole="header">
          {t.gallery.heading}
        </Text>
        <Button
          label={t.gallery.training}
          accessibilityHint={t.gallery.trainingHint}
          onPress={() => router.push('/training')}
        />
        <Button label={t.gallery.settings} onPress={() => router.push('/settings')} />
      </View>
      <View style={styles.pager} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {height > 0 && (
          <FlatList
            ref={listRef}
            data={ARTWORKS}
            keyExtractor={(entry) => entry.manifest.id}
            renderItem={({ item }) => (
              <ArtworkPage
                entry={item}
                height={height}
                onOpen={() => open(item)}
                onRepeat={preview.repeat}
                onDetails={() => router.push({ pathname: '/details/[id]', params: { id: item.manifest.id } })}
              />
            )}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            viewabilityConfig={VIEWABILITY}
            onViewableItemsChanged={onViewableItemsChanged}
            ListFooterComponent={
              <View style={[styles.end, { height }]}>
                <Text style={styles.endTitle} accessibilityRole="header">
                  {t.gallery.end}
                </Text>
                <Button
                  label={t.gallery.backToStart}
                  onPress={() => listRef.current?.scrollToIndex({ index: 0 })}
                />
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.s,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
  },
  heading: { ...TYPE.title, color: COLORS.text, flexGrow: 1 },
  pager: { flex: 1 },
  end: { justifyContent: 'center', alignItems: 'center', gap: SPACING.l, padding: SPACING.l },
  endTitle: { ...TYPE.title, color: COLORS.text },
});
