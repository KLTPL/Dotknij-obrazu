import type { ArtworkLayers, ArtworkManifest } from '@repo/shared';

import { decodeBase64 } from './base64';

/** One package from assets/artworks, as listed in the generated registry. */
export type ArtworkEntry = {
  manifest: ArtworkManifest;
  /** Metro asset id of image.jpg. */
  image: number;
  /** Metro asset id of contours.png. */
  contours: number;
  /** Deferred, because layers.json is large and only the opened artwork needs it. */
  loadLayers: () => ArtworkLayers;
  /** Metro asset ids of the highlight overlays, by object id. */
  highlights: Record<number, number>;
};

export type DecodedLayers = {
  width: number;
  height: number;
  objectIds: Uint8Array;
  depth: Uint8Array;
  contours: Uint8Array;
};

export function decodeLayers(entry: ArtworkEntry): DecodedLayers {
  const { width, height } = entry.manifest.layers;
  const layers = entry.loadLayers();
  return {
    width,
    height,
    objectIds: decodeBase64(layers.objectIds),
    depth: decodeBase64(layers.depth),
    contours: decodeBase64(layers.contours),
  };
}

/** Index of the layer pixel under a point given in 0..1 of the image; -1 outside the image. */
export function pixelIndex(layers: DecodedLayers, x: number, y: number): number {
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return -1;
  return Math.floor(y * layers.height) * layers.width + Math.floor(x * layers.width);
}
