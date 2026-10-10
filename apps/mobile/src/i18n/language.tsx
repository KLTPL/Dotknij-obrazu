import type { ArtworkLanguage } from '@repo/shared';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { STRINGS } from './strings';

type LanguageState = { language: ArtworkLanguage; setLanguage: (language: ArtworkLanguage) => void };

const LanguageContext = createContext<LanguageState>({ language: 'pl', setLanguage: () => {} });

/** The app starts in Polish on a phone set to Polish and in English on any other. */
function deviceLanguage(): ArtworkLanguage {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.startsWith('pl') ? 'pl' : 'en';
  } catch {
    return 'pl';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(deviceLanguage);
  const state = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext.Provider value={state}>{children}</LanguageContext.Provider>;
}

/** The chosen language and `t`, the texts of the app's screens in it. */
export function useLanguage() {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, setLanguage, t: STRINGS[language] };
}
