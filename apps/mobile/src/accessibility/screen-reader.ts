import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether a screen reader (TalkBack, VoiceOver) is running; null until the phone answers.
 * On Android it reports touch exploration, so it turns false while TalkBack is paused,
 * which is exactly when the app has to speak for itself.
 */
let screenReader: boolean | null = null;
const listeners = new Set<() => void>();

function set(enabled: boolean) {
  screenReader = enabled;
  listeners.forEach((listener) => listener());
}

// Kept for the app's lifetime, because the reader can be switched on or paused while the app runs
AccessibilityInfo.addEventListener('screenReaderChanged', set);
void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
  if (screenReader === null) set(enabled);
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Null until the phone has answered whether a screen reader is running. */
export function useScreenReaderStatus(): boolean | null {
  return useSyncExternalStore(subscribe, () => screenReader);
}

export function useScreenReader(): boolean {
  return useScreenReaderStatus() ?? false;
}
