import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/i18n/language';
import { LanguageSwitch } from '@/settings/language-switch';
import { useSettings } from '@/settings/settings';
import { COLORS, MIN_TARGET, RADIUS, SPACING, TYPE } from '@/theme';
import { Button } from '@/ui/button';

// The voice belongs to the phone's speech engine; phone makers hide this screen in different menus
function openVoiceSettings() {
  Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => Linking.openSettings());
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { settings, update } = useSettings();
  const togglePreview = () => update({ galleryPreview: !settings.galleryPreview });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Button label={t.artwork.back} accessibilityLabel={t.artwork.backLabel} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {t.settings.title}
        </Text>

        <Text style={styles.heading} accessibilityRole="header">
          {t.settings.language}
        </Text>
        <LanguageSwitch />

        {/* The whole row is one switch, so a screen reader reads its name, description and state together */}
        <Pressable
          style={styles.row}
          onPress={togglePreview}
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.galleryPreview }}
          accessibilityLabel={t.settings.preview}
          accessibilityHint={t.settings.previewText}
        >
          <View style={styles.rowText}>
            <Text style={styles.text}>{t.settings.preview}</Text>
            <Text style={styles.muted}>{t.settings.previewText}</Text>
          </View>
          <Switch
            value={settings.galleryPreview}
            onValueChange={togglePreview}
            trackColor={{ true: COLORS.accent }}
            importantForAccessibility="no"
          />
        </Pressable>

        <Button label={t.settings.voice} accessibilityHint={t.settings.voiceHint} onPress={openVoiceSettings} />
        <Button label={t.settings.training} onPress={() => router.push('/training')} />
        <Button
          label={t.settings.welcome}
          onPress={() => {
            update({ onboarded: false });
            router.back();
          }}
        />

        <Text style={styles.heading} accessibilityRole="header">
          {t.settings.gestures}
        </Text>
        {t.settings.gestureList.map((gesture) => (
          <Text key={gesture} style={styles.text}>
            {gesture}
          </Text>
        ))}

        <Text style={styles.heading} accessibilityRole="header">
          {t.settings.about}
        </Text>
        <Text style={styles.muted}>{t.settings.aboutText}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    minHeight: MIN_TARGET,
    padding: SPACING.l,
    marginTop: SPACING.l,
    borderRadius: RADIUS,
    backgroundColor: COLORS.surface,
  },
  rowText: { flex: 1, gap: SPACING.xs },
  text: { ...TYPE.body, color: COLORS.textSecondary },
  muted: { ...TYPE.small, color: COLORS.muted },
});
