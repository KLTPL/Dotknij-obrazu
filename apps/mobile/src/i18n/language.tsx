import type { ArtworkLanguage } from '@repo/shared';

import { useSettings } from '@/settings/settings';

import { STRINGS } from './strings';

/** The chosen language and `t`, the texts of the app's screens in it. */
export function useLanguage() {
  const { settings, update } = useSettings();
  const { language } = settings;
  return { language, setLanguage: (value: ArtworkLanguage) => update({ language: value }), t: STRINGS[language] };
}
