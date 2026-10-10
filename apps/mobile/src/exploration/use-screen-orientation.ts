import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

/** Turns the screen to match the artwork, so a wide painting fills a phone held sideways. */
export function useScreenOrientation(landscape: boolean) {
  useEffect(() => {
    const { LANDSCAPE, PORTRAIT_UP } = ScreenOrientation.OrientationLock;
    void ScreenOrientation.lockAsync(landscape ? LANDSCAPE : PORTRAIT_UP);
    return () => {
      void ScreenOrientation.lockAsync(PORTRAIT_UP);
    };
  }, [landscape]);
}
