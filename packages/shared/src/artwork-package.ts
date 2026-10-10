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

/** How the surface of an object feels under a moving finger, from no vibration to strong, sparse bumps. */
export type ArtworkTexture = 'smooth' | 'soft' | 'grainy' | 'rough';

/**
 * Whether an object acts in the scene. A dynamic object keeps sounding under a resting finger, so
 * a sound that goes on after the finger stops always means action; a static one is heard only
 * while the finger moves over it, like a real surface. The first rule that fits decides:
 *
 * 1. An object showing people or animals is dynamic, also when they rest or sleep and when they
 *    come with their things (a cart with people, boats with rowers).
 * 2. When one thing acts on another, the one acting is dynamic and the one acted upon is static:
 *    a man knocking a stick on a road is dynamic, the road is static. A tool belongs to its user.
 * 3. A place (trees, a pond, a field) is dynamic only when living beings are visible in it and
 *    its sound is theirs: trees with crows cawing. A tree given birdsong with no bird in it is static.
 * 4. Fire is dynamic. Water is dynamic as a single event (a breaking wave, a pouring stream) and
 *    static as an expanse (sea, pond, river). Wind never makes anything dynamic.
 * 5. Everything else is static: ground, sky, mountains, plants, buildings, furniture, food.
 * 6. In doubt, static.
 */
export type ArtworkRole = 'dynamic' | 'static';

/** Languages the app speaks. Polish is the base language of every package. */
export type ArtworkLanguage = 'pl' | 'en';

/** Everything said or shown about one object. */
export type ArtworkObjectTexts = {
  /** Name, spoken on double tap before the description. */
  label: string;
  /** One sentence shown as a caption for the audience. */
  shortDescription: string;
  /** A few sentences following audio description rules, spoken on double tap. */
  longDescription: string;
  /**
   * Who or what this is beyond what can be seen: the person's name, history, curiosities.
   * Spoken on a second double tap on the same object.
   */
  story?: string;
};

export type ArtworkObject = ArtworkObjectTexts & {
  /** Value of this object's pixels in the object-id layer: 1..255. 0 is the background. */
  id: number;
  /** File name without extension from apps/mobile/assets/sounds. */
  sound: string;
  texture: ArtworkTexture;
  role: ArtworkRole;
  /** The same texts in English; without them the app falls back to Polish. */
  en?: ArtworkObjectTexts;
};

/** Everything said or shown about the artwork as a whole. */
export type ArtworkTexts = {
  title: string;
  author: string;
  year: string;
  /** Where the original is kept. */
  institution: string;
  license: string;
  /** Audio description of the whole artwork. */
  description: string;
  /** History of the artwork and curiosities about it, spoken on a second two-finger tap. */
  story?: string;
};

export type ArtworkManifest = ArtworkTexts & {
  id: string;
  /** URL the image was downloaded from. */
  source: string;
  /** The same texts in English; without them the app falls back to Polish. */
  en?: ArtworkTexts;
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
   * Closeness to the nearest contour worth tracing with a finger, falling to 0 a few pixels
   * away from it. On the contour the value grows with its depth: outlines of things close
   * to the viewer reach 255, distant ones about half of that. Drives the vibration.
   */
  contours: string;
};
