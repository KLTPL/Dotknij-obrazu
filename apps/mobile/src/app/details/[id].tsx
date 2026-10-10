import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ArtworkEntry, localizeManifest } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { useLanguage } from '@/i18n/language';
import { COLORS, RADIUS, SPACING, TYPE } from '@/theme';
import { Button } from '@/ui/button';

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = ARTWORKS.find((artwork) => artwork.manifest.id === id);
  if (!entry) return <Redirect href="/" />;
  return <Details entry={entry} />;
}

/**
 * Everything known about a painting as plain text. Exploring by touch is the heart of the app,
 * but every description must also be reachable without finding its object with a finger.
 */
function Details({ entry }: { entry: ArtworkEntry }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const manifest = localizeManifest(entry.manifest, language);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.bar}>
        <Button label={t.details.close} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {manifest.title}
        </Text>
        <Text style={styles.text}>
          {manifest.author}, {manifest.year}
        </Text>
        <Text style={styles.muted}>
          {manifest.institution} · {manifest.license}
        </Text>

        <Text style={styles.heading} accessibilityRole="header">
          {t.details.description}
        </Text>
        <Text style={styles.text}>{manifest.description}</Text>

        {manifest.story && (
          <>
            <Text style={styles.heading} accessibilityRole="header">
              {t.details.story}
            </Text>
            <Text style={styles.text}>{manifest.story}</Text>
          </>
        )}

        <Text style={styles.heading} accessibilityRole="header">
          {t.details.objects}
        </Text>
        {manifest.objects.map((object) => (
          <View key={object.id} style={styles.object}>
            <Text style={styles.objectName} accessibilityRole="header">
              {object.label}
            </Text>
            <Text style={styles.text}>{object.longDescription}</Text>
            {object.story && <Text style={styles.text}>{object.story}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  bar: { flexDirection: 'row', paddingHorizontal: SPACING.l, paddingVertical: SPACING.s },
  content: { padding: SPACING.l, gap: SPACING.m },
  title: { ...TYPE.display, color: COLORS.text },
  heading: { ...TYPE.heading, color: COLORS.text, marginTop: SPACING.l },
  object: { gap: SPACING.s, padding: SPACING.l, borderRadius: RADIUS, backgroundColor: COLORS.surface },
  objectName: { ...TYPE.heading, color: COLORS.accent },
  text: { ...TYPE.body, color: COLORS.textSecondary, lineHeight: 25 },
  muted: { ...TYPE.small, color: COLORS.muted },
});
