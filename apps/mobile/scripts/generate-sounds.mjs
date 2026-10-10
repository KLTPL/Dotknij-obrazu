// Synthesizes every looping sound of the app into assets/sounds.
// Generated in-house, so there are no licensing questions. Run: pnpm --filter @repo/mobile sounds
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bird, crow, dogs, horse } from './sounds/animals.mjs';
import { encodeWav, normalize } from './sounds/dsp.mjs';
import { fire, mud, pour, skates, steps, water, wind } from './sounds/nature.mjs';
import { cart, crunch, hum, knock } from './sounds/objects.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
const RECIPES = { bird, cart, crow, crunch, dogs, fire, horse, hum, knock, mud, pour, skates, steps, water, wind };

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, generate] of Object.entries(RECIPES)) {
  writeFileSync(join(OUT_DIR, `${name}.wav`), encodeWav(normalize(generate())));
  console.log(`assets/sounds/${name}.wav`);
}
