import { Link } from 'expo-router';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ArtworkLanguage } from '@repo/shared';

import { type ArtworkEntry, localizeManifest } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';
import { useLanguage } from '@/i18n/language';
import { LANGUAGE_NAMES } from '@/i18n/strings';

function ArtworkCard({ entry }: { entry: ArtworkEntry }) {
  const { language, t } = useLanguage();
  const { id, title, author, year, institution, license, objects, layers } = localizeManifest(entry.manifest, language);
  const landscape = layers.width > layers.height;
  return (
    <Link href={{ pathname: '/artwork/[id]', params: { id } }} asChild>
      <Pressable
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={t.gallery.cardLabel(title, author, year, objects.length, landscape)}
        accessibilityHint={t.gallery.cardHint}
      >
        <Image source={entry.image} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.cardText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>
            {author}, {year}
          </Text>
          <Text style={styles.orientation}>{landscape ? t.gallery.landscape : t.gallery.portrait}</Text>
          <Text style={styles.muted}>
            {institution} · {license}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

// The voice belongs to the phone's speech engine; phone makers hide this screen in different menus
function openVoiceSettings() {
  Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => Linking.openSettings());
}

function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <View style={styles.languages} accessibilityRole="radiogroup" accessibilityLabel={t.gallery.language}>
      {(Object.keys(LANGUAGE_NAMES) as ArtworkLanguage[]).map((value) => (
        <Pressable
          key={value}
          onPress={() => setLanguage(value)}
          style={[styles.language, language === value && styles.languageActive]}
          accessibilityRole="radio"
          accessibilityState={{ checked: language === value }}
          accessibilityLabel={LANGUAGE_NAMES[value]}
        >
          <Text style={[styles.text, language === value && styles.languageActiveText]}>{LANGUAGE_NAMES[value]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Header() {
  const { t } = useLanguage();
  return (
    <View style={styles.header}>
      <Text style={styles.appName} accessibilityRole="header">
        Dotknij obrazu
      </Text>
      <Text style={styles.text}>{t.gallery.tagline}</Text>
      <LanguageSwitch />
      <Link href="/training" asChild>
        <Pressable
          style={styles.training}
          accessibilityRole="button"
          accessibilityLabel={t.gallery.training}
          accessibilityHint={t.gallery.trainingHint}
        >
          <Text style={styles.trainingTitle}>{t.gallery.training}</Text>
          <Text style={styles.trainingText}>{t.gallery.trainingText}</Text>
        </Pressable>
      </Link>
      <Pressable
        style={styles.voice}
        onPress={openVoiceSettings}
        accessibilityRole="button"
        accessibilityLabel={t.gallery.voiceLabel}
        accessibilityHint={t.gallery.voiceHint}
      >
        <Text style={styles.text}>{t.gallery.voice}</Text>
      </Pressable>
      <Text style={styles.section} accessibilityRole="header">
        {t.gallery.heading}
      </Text>
    </View>
  );
}

export default function GalleryScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <FlatList
        data={ARTWORKS}
        keyExtractor={(entry) => entry.manifest.id}
        renderItem={({ item }) => <ArtworkCard entry={item} />}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  list: { padding: 16, gap: 14 },
  header: { gap: 12 },
  appName: { color: '#fff', fontSize: 32, fontWeight: '700' },
  section: { color: '#fff', fontSize: 20, fontWeight: '600', marginTop: 8 },
  training: { padding: 16, borderRadius: 14, backgroundColor: '#ffd60a' },
  trainingTitle: { color: '#000', fontSize: 20, fontWeight: '700' },
  trainingText: { color: '#000', fontSize: 15 },
  voice: { padding: 14, borderRadius: 14, backgroundColor: '#1a1a1a' },
  languages: { flexDirection: 'row', gap: 8 },
  language: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#1a1a1a' },
  languageActive: { backgroundColor: '#ffd60a' },
  languageActiveText: { color: '#000', fontWeight: '700' },
  card: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  thumbnail: { width: '100%', height: 170 },
  cardText: { padding: 14, gap: 2 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  text: { color: '#e0e0e0', fontSize: 16 },
  orientation: { color: '#ffd60a', fontSize: 14, fontWeight: '600', marginTop: 4 },
  muted: { color: '#a0a0a0', fontSize: 13 },
});
