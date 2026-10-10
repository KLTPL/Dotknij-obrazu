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

const OWNER_SEARCH_RADIUS_PX = 12;

/**
 * Id of the object a contour at the given point outlines, or 0 if it is part of the background.
 * A silhouette belongs to the thing in front of it, so of the objects around the point
 * the one closest to the viewer wins.
 */
export function contourOwner(layers: DecodedLayers, x: number, y: number): number {
  let owner = 0;
  let nearest = -1;
  for (let step = 0; step < 8; step++) {
    const angle = (step * Math.PI) / 4;
    const index = pixelIndex(
      layers,
      x + (Math.cos(angle) * OWNER_SEARCH_RADIUS_PX) / layers.width,
      y + (Math.sin(angle) * OWNER_SEARCH_RADIUS_PX) / layers.height,
    );
    if (index >= 0 && layers.objectIds[index] !== 0 && layers.depth[index] > nearest) {
      owner = layers.objectIds[index];
      nearest = layers.depth[index];
    }
  }
  return owner;
}

/** Index of the layer pixel under a point given in 0..1 of the image; -1 outside the image. */
export function pixelIndex(layers: DecodedLayers, x: number, y: number): number {
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return -1;
  return Math.floor(y * layers.height) * layers.width + Math.floor(x * layers.width);
}
