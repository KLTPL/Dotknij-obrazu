/**
 * Shared look of the screens. High contrast for low vision: every text colour reaches at least
 * WCAG AA (4.5:1) on the backgrounds it is used on, the yellow accent over 13:1 on black.
 */
export const COLORS = {
  background: '#000',
  surface: '#1a1a1a',
  surfaceRaised: '#262626',
  text: '#fff',
  textSecondary: '#e0e0e0',
  muted: '#a8a8a8',
  accent: '#ffd60a',
  onAccent: '#000',
};

export const SPACING = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

export const RADIUS = 14;

/** Smallest touch target, as Android and WCAG 2.5.8 recommend. */
export const MIN_TARGET = 48;

export const TYPE = {
  display: { fontSize: 30, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 17 },
  small: { fontSize: 14 },
} as const;
