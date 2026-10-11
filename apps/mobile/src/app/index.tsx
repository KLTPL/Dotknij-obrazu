import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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
  // The height the list last measured itself at
  const listHeightRef = useRef(0);
  // Null while the end of the gallery is on screen
  const [page, setPage] = useState<number | null>(0);
  const preview = useGalleryPreview(page === null ? null : ARTWORKS[page]);
  // FlatList requires a callback that never changes; this one changes only together with the list's key
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ArtworkEntry>[] }) => {
      // A list no longer one page tall is about to be replaced, and its old offset shows another painting
      if (listHeightRef.current === height) setPage(viewableItems[0]?.index ?? null);
    },
    [height],
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
            // A landscape painting turns the gallery underneath it too, and a scroll offset kept from
            // one page height lands between pages at another; so each height gets a new list opened at
            // the same page. The end of the gallery is not an item, so there it opens at the last painting.
            key={height}
            initialScrollIndex={page ?? ARTWORKS.length - 1}
            onLayout={(event) => {
              listHeightRef.current = event.nativeEvent.layout.height;
            }}
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
