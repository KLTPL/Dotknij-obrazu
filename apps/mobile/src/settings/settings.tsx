import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArtworkLanguage } from '@repo/shared';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Settings = {
  language: ArtworkLanguage;
  /** Whether the painting on screen in the gallery quietly plays its sounds. */
  galleryPreview: boolean;
  /** Whether the welcome screen has been passed. */
  onboarded: boolean;
};

type SettingsState = { settings: Settings; update: (change: Partial<Settings>) => void };

const STORAGE_KEY = 'settings';

const SettingsContext = createContext<SettingsState | null>(null);

/** The app starts in Polish on a phone set to Polish and in English on any other. */
function defaultSettings(): Settings {
  return {
    language: getLocales()[0].languageCode === 'pl' ? 'pl' : 'en',
    galleryPreview: true,
    onboarded: false,
  };
}

/** Loads the saved settings before rendering anything, and saves every change on the phone. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      // Fields added in a later version of the app keep their defaults
      setSettings({ ...defaultSettings(), ...(saved ? (JSON.parse(saved) as Partial<Settings>) : {}) });
    });
  }, []);

  const state = useMemo(
    () =>
      settings && {
        settings,
        update: (change: Partial<Settings>) => {
          const next = { ...settings, ...change };
          setSettings(next);
          void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        },
      },
    [settings],
  );

  if (!state) return null;
  return <SettingsContext.Provider value={state}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const state = useContext(SettingsContext);
  if (!state) throw new Error('useSettings() needs a SettingsProvider above it');
  return state;
}
