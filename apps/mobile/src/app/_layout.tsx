import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useScreenReaderStatus } from '@/accessibility/screen-reader';
import { SettingsProvider } from '@/settings/settings';
import { COLORS } from '@/theme';

// The splash stays until the saved settings and the screen reader state are known,
// so the first screen speaks the right language and never over TalkBack
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const screenReader = useScreenReaderStatus();
  return <SettingsProvider>{screenReader !== null && <Navigator />}</SettingsProvider>;
}

function Navigator() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
        <Stack.Screen name="details/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
