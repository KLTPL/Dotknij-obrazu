// Synthesizes the seamless looping sounds used by the readability test.
// Generated in-house, so there are no licensing questions. Run: pnpm sounds
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// Deterministic PRNG so regenerated files are byte-identical
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function encodeWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  });
  return buffer;
}

// Equalizes perceived loudness between very different sounds (noise vs. clicks)
function normalize(samples, targetRms = 0.18, peakLimit = 0.9) {
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const gain = Math.min(targetRms / rms, peakLimit / peak);
  return samples.map((s) => s * gain);
}

// Adds a short event into a looping buffer, wrapping around the end
function addEvent(buffer, startSec, durationSec, fn) {
  const start = Math.round(startSec * SAMPLE_RATE);
  const length = Math.round(durationSec * SAMPLE_RATE);
  for (let i = 0; i < length; i++) {
    buffer[(start + i) % buffer.length] += fn(i / SAMPLE_RATE);
  }
}

// Canter: three hoof beats per stride, low thump plus a dull click
function horse() {
  const random = mulberry32(1);
  const buffer = new Float64Array(Math.round(1.5 * SAMPLE_RATE));
  const stride = 0.75;
  for (let s = 0; s < 2; s++) {
    [0, 0.11, 0.22].forEach((offset, beat) => {
      const accent = beat === 2 ? 1 : 0.75;
      let lowpassed = 0;
      addEvent(buffer, s * stride + offset, 0.18, (t) => {
        const freq = 55 + 45 * Math.exp(-t / 0.02);
        const thump = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.035);
        lowpassed += 0.25 * (random() * 2 - 1 - lowpassed);
        const click = lowpassed * Math.exp(-t / 0.01);
        return accent * (thump + 1.5 * click);
      });
    });
  }
  return Array.from(buffer);
}

// Song bird: a run of rising chirps followed by a short twitter
function bird() {
  const buffer = new Float64Array(Math.round(2 * SAMPLE_RATE));
  const chirp = (from, to, duration) => {
    let phase = 0;
    return (t) => {
      const progress = t / duration;
      const freq = from + (to - from) * progress + 120 * Math.sin(2 * Math.PI * 35 * t);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      return Math.sin(phase) * Math.sin(Math.PI * progress) ** 2;
    };
  };
  [0, 0.17, 0.34].forEach((start) => addEvent(buffer, start, 0.09, chirp(2800, 4600, 0.09)));
  [0.95, 1.03, 1.11, 1.19].forEach((start) => addEvent(buffer, start, 0.05, chirp(4200, 3300, 0.05)));
  return Array.from(buffer);
}

// Stream: low-passed noise with a slow swell and occasional gurgles
function water() {
  const random = mulberry32(7);
  const length = Math.round(2 * SAMPLE_RATE);
  const fade = Math.round(0.2 * SAMPLE_RATE);
  const raw = new Float64Array(length + fade);
  let lowpassed = 0;
  for (let i = 0; i < raw.length; i++) {
    lowpassed += 0.12 * (random() * 2 - 1 - lowpassed);
    raw[i] = lowpassed;
  }
  // Crossfade the tail into the head so the noise loops without a seam
  const buffer = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = raw[i];
    if (i < fade) {
      const k = i / fade;
      buffer[i] = raw[i] * k + raw[length + i] * (1 - k);
    }
    buffer[i] *= 0.7 + 0.3 * Math.sin((2 * Math.PI * i) / length);
  }
  for (let g = 0; g < 9; g++) {
    const base = 350 + random() * 500;
    let phase = 0;
    addEvent(buffer, random() * 2, 0.04, (t) => {
      phase += (2 * Math.PI * (base + 6000 * t)) / SAMPLE_RATE;
      return 0.35 * Math.sin(phase) * Math.sin((Math.PI * t) / 0.04);
    });
  }
  return Array.from(buffer);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, generate] of Object.entries({ horse, bird, water })) {
  writeFileSync(join(OUT_DIR, `${name}.wav`), encodeWav(normalize(generate())));
  console.log(`assets/sounds/${name}.wav`);
}
