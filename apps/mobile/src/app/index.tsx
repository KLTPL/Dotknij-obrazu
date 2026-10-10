import { Link } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ArtworkEntry } from '@/artworks/artwork';
import { ARTWORKS } from '@/artworks/registry';

function ArtworkCard({ entry }: { entry: ArtworkEntry }) {
  const { id, title, author, year, institution, license, objects } = entry.manifest;
  return (
    <Link href={{ pathname: '/artwork/[id]', params: { id } }} asChild>
      <Pressable
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${author}, ${year}. Obiektów do odkrycia: ${objects.length}.`}
        accessibilityHint="Otwiera obraz do poznawania dotykiem"
      >
        <Image source={entry.image} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.cardText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>
            {author}, {year}
          </Text>
          <Text style={styles.muted}>
            {institution} · {license}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.appName} accessibilityRole="header">
        Dotknij obrazu
      </Text>
      <Text style={styles.text}>Poznaj obraz, wodząc po nim palcem. Dźwięk mówi, co jest pod palcem.</Text>
      <Link href="/training" asChild>
        <Pressable
          style={styles.training}
          accessibilityRole="button"
          accessibilityLabel="Trening"
          accessibilityHint="Krótkie ćwiczenie przed poznawaniem obrazów"
        >
          <Text style={styles.trainingTitle}>Trening</Text>
          <Text style={styles.trainingText}>20 sekund ćwiczenia na prostych kształtach, zanim otworzysz obraz</Text>
        </Pressable>
      </Link>
      <Text style={styles.section} accessibilityRole="header">
        Galeria
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
  card: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  thumbnail: { width: '100%', height: 170 },
  cardText: { padding: 14, gap: 2 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  text: { color: '#e0e0e0', fontSize: 16 },
  muted: { color: '#a0a0a0', fontSize: 13 },
});
