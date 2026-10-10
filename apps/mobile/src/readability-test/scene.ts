import type { AudioSource } from 'expo-audio';

export type ObjectId = 'horse' | 'bird' | 'water';

export type SceneObject = {
  id: ObjectId;
  color: string;
  sound: AudioSource;
};

/** Normalized to the board: 0..1 on both axes. */
export type Rect = { x: number; y: number; width: number; height: number };

export type PlacedObject = SceneObject & { rect: Rect };

export const SCENE_OBJECTS: readonly SceneObject[] = [
  { id: 'horse', color: '#b5793a', sound: require('../../assets/sounds/horse.wav') },
  { id: 'bird', color: '#3a8fb5', sound: require('../../assets/sounds/bird.wav') },
  { id: 'water', color: '#3ab58a', sound: require('../../assets/sounds/water.wav') },
];

// Objects land in random cells of a 2x3 grid, so each one is large enough
// to find by touch and the layout cannot be memorized between trials.
const COLS = 2;
const ROWS = 3;
const CELL_PADDING = 0.08;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomLayout(): PlacedObject[] {
  const cells = shuffle([...Array(COLS * ROWS).keys()]);
  const cellWidth = 1 / COLS;
  const cellHeight = 1 / ROWS;
  return SCENE_OBJECTS.map((object, i) => {
    const col = cells[i] % COLS;
    const row = Math.floor(cells[i] / COLS);
    return {
      ...object,
      rect: {
        x: col * cellWidth + cellWidth * CELL_PADDING,
        y: row * cellHeight + cellHeight * CELL_PADDING,
        width: cellWidth * (1 - 2 * CELL_PADDING),
        height: cellHeight * (1 - 2 * CELL_PADDING),
      },
    };
  });
}

export function objectAt(objects: readonly PlacedObject[], x: number, y: number): PlacedObject | null {
  return (
    objects.find(
      ({ rect }) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height,
    ) ?? null
  );
}
