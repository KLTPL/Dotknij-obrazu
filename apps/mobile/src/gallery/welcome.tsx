import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSpeaker } from '@/exploration/use-speaker';
import { useLanguage } from '@/i18n/language';
import { LanguageSwitch } from '@/settings/language-switch';
import { useSettings } from '@/settings/settings';
import { COLORS, SPACING, TYPE } from '@/theme';
import { Button } from '@/ui/button';

// No sounds play here, so there is nothing to lower under the voice
const NO_DUCKING = () => {};

/** First screen after installing: what the app does, and the way to the training. */
export function Welcome() {
  const router = useRouter();
  const { t } = useLanguage();
  const { update } = useSettings();
  const speaker = useSpeaker(NO_DUCKING);

  useEffect(() => {
    speaker.introduce(`${t.welcome.lead} ${t.welcome.advice} ${t.welcome.buttons}`);
    return speaker.stop;
  }, [speaker, t]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.appName} accessibilityRole="header">
          Dotknij obrazu
        </Text>
        <Text style={styles.lead}>{t.welcome.lead}</Text>
        <Text style={styles.text}>{t.welcome.advice}</Text>
        <LanguageSwitch />
      </ScrollView>
      <View style={styles.buttons}>
        <Button
          primary
          label={t.welcome.training}
          onPress={() => {
            update({ onboarded: true });
            router.push('/training');
          }}
        />
        <Button label={t.welcome.gallery} onPress={() => update({ onboarded: true })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.l, gap: SPACING.l },
  appName: { ...TYPE.display, color: COLORS.text, marginTop: SPACING.xl },
  lead: { ...TYPE.heading, fontWeight: '400', color: COLORS.text, lineHeight: 28 },
  text: { ...TYPE.body, color: COLORS.textSecondary },
  buttons: { padding: SPACING.l, gap: SPACING.m },
});
