import type { ArtworkLanguage } from '@repo/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/i18n/language';
import { LANGUAGE_NAMES } from '@/i18n/strings';
import { COLORS, MIN_TARGET, RADIUS, SPACING, TYPE } from '@/theme';

export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <View style={styles.languages} accessibilityRole="radiogroup" accessibilityLabel={t.settings.language}>
      {(Object.keys(LANGUAGE_NAMES) as ArtworkLanguage[]).map((value) => (
        <Pressable
          key={value}
          onPress={() => setLanguage(value)}
          style={[styles.language, language === value && styles.active]}
          accessibilityRole="radio"
          accessibilityState={{ checked: language === value }}
          accessibilityLabel={LANGUAGE_NAMES[value]}
          // Read in its own language, so a visitor finds theirs whichever language the app speaks
          accessibilityLanguage={value}
        >
          <Text style={[styles.text, language === value && styles.activeText]}>{LANGUAGE_NAMES[value]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  languages: { flexDirection: 'row', gap: SPACING.s },
  language: {
    flex: 1,
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS,
    backgroundColor: COLORS.surfaceRaised,
  },
  active: { backgroundColor: COLORS.accent },
  text: { ...TYPE.body, color: COLORS.text },
  activeText: { color: COLORS.onAccent, fontWeight: '700' },
});
