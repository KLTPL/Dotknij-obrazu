import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LanguageProvider } from '@/i18n/language';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
    </LanguageProvider>
  );
}
