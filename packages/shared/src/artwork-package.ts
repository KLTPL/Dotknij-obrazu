/**
 * Contract of an artwork's "sensory package". The Python pipeline writes it to
 * apps/mobile/assets/artworks/<id>/ and the mobile app reads it:
 *
 *   manifest.json     ArtworkManifest
 *   layers.json       ArtworkLayers
 *   image.jpg         the artwork shown on screen
 *   highlight-<n>.png transparent overlay marking object <n> (same aspect ratio as the image)
 *   contours.png      transparent overlay drawing the contour layer as white lines
 */

export type ArtworkObject = {
  /** Value of this object's pixels in the object-id layer: 1..255. 0 is the background. */
  id: number;
  /** Polish name, spoken when the finger rests on the object. */
  label: string;
  /** One sentence shown as a caption for the audience. */
  shortDescription: string;
  /** A few sentences following audio description rules, spoken on double tap. */
  longDescription: string;
  /** File name without extension from apps/mobile/assets/sounds. */
  sound: string;
};

export type ArtworkManifest = {
  id: string;
  title: string;
  author: string;
  year: string;
  /** Where the original is kept. */
  institution: string;
  license: string;
  /** URL the image was downloaded from. */
  source: string;
  /** Audio description of the whole artwork. */
  description: string;
  /** Size of every layer in pixels; the longer side is about 512. */
  layers: { width: number; height: number };
  objects: ArtworkObject[];
};

/**
 * Per-pixel maps as base64 of raw bytes: one byte per pixel, row by row from the
 * top-left corner, so each one decodes to `layers.width * layers.height` bytes.
 * Raw bytes instead of PNG because React Native has no canvas to read pixels from.
 */
export type ArtworkLayers = {
  /** ArtworkObject.id under each pixel, 0 = background. */
  objectIds: string;
  /** 0 = far, 255 = near. */
  depth: string;
  /**
   * Closeness to the nearest contour worth tracing with a finger: 255 on the contour,
   * falling to 0 a few pixels away. Drives the vibration.
   */
  contours: string;
};
