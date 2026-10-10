// Synthesizes the sounds we have no recording for: object loops into assets/sounds
// (every other loop is cut from a CC0 or public domain recording by pipeline/sounds.py) and the border
// signals into assets/cues, apart from the loops, so no artwork object can be given one.
// Run: pnpm --filter @repo/mobile sounds
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const seconds = (duration) => Math.round(duration * SAMPLE_RATE);

// Adds a short event into a looping buffer, wrapping around the end
function addEvent(buffer, start, duration, fn) {
  const first = seconds(start);
  const length = seconds(duration);
  for (let i = 0; i < length; i++) {
    buffer[(first + i) % buffer.length] += fn(i / SAMPLE_RATE);
  }
}

// Sine with a changing pitch needs its phase accumulated sample by sample
function sweep(frequencyAt) {
  let phase = 0;
  return (t) => {
    phase += (2 * Math.PI * frequencyAt(t)) / SAMPLE_RATE;
    return Math.sin(phase);
  };
}

// White noise from a seeded generator, so running the script again gives the same files
function noise(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return (state / 4294967296) * 2 - 1;
  };
}

// Band-pass filter (RBJ biquad) whose centre frequency may change over time
function bandPass(frequencyAt, q) {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (t, x) => {
    const w = (2 * Math.PI * frequencyAt(t)) / SAMPLE_RATE;
    const alpha = Math.sin(w) / (2 * q);
    const y = (alpha * (x - x2) + 2 * Math.cos(w) * y1 - (1 - alpha) * y2) / (1 + alpha);
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

// Same loudness target as the recordings (pipeline/sounds.py)
function normalize(samples, targetRms = 0.18, peakLimit = 0.9) {
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const gain = Math.min(targetRms / rms, peakLimit / peak);
  return samples.map((s) => s * gain);
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

// A woman humming four slow notes; soft harmonics and vibrato make the tone voice-like
function hum() {
  const notes = [440, 523.25, 493.88, 392];
  const noteDuration = 1;
  const buffer = new Float64Array(seconds(notes.length * noteDuration));
  notes.forEach((frequency, i) => {
    const pitch = (t) => frequency * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t));
    const harmonics = [sweep(pitch), sweep((t) => 2 * pitch(t)), sweep((t) => 3 * pitch(t))];
    addEvent(buffer, i * noteDuration, noteDuration, (t) => {
      const envelope = Math.min(1, t / 0.12) * Math.min(1, (noteDuration - t) / 0.25);
      return envelope * (harmonics[0](t) + 0.28 * harmonics[1](t) + 0.08 * harmonics[2](t));
    });
  });
  return buffer;
}

// A scythe mowing grass: a long swish as the blade cuts, a lighter one as it swings back.
// No CC0 recording of a scythe exists, so the swish is noise with a rising band.
function scythe() {
  const random = noise(7);
  const strokes = [
    { start: 0, duration: 0.8, from: 1200, to: 4200, level: 1 },
    { start: 1.1, duration: 0.5, from: 3000, to: 1800, level: 0.45 },
  ];
  const buffer = new Float64Array(seconds(1.9));
  for (const { start, duration, from, to, level } of strokes) {
    const filter = bandPass((t) => from + (to - from) * (t / duration), 2.5);
    addEvent(buffer, start, duration, (t) => {
      const envelope = Math.sin((Math.PI * t) / duration) ** 2;
      return level * envelope * filter(t, random());
    });
  }
  return buffer;
}

// A marching snare drum: four beats with a short roll before the next bar
function drum() {
  const random = noise(11);
  const beat = 0.45;
  const hits = [0, 1, 2, 2.5, 3, 3.25, 3.5, 3.75].map((position) => position * beat);
  const buffer = new Float64Array(seconds(4 * beat));
  hits.forEach((start, i) => {
    const filter = bandPass(() => 3500, 0.8);
    const body = sweep(() => 190);
    const accent = i === 0 ? 1 : 0.7;
    addEvent(buffer, start, 0.25, (t) => {
      const rattle = Math.exp(-t / 0.06) * filter(t, random());
      const skin = 0.6 * Math.exp(-t / 0.03) * body(t);
      return accent * (rattle + skin);
    });
  });
  return buffer;
}

// Two quick notes marking the border of an object: rising when the finger enters, falling when it leaves
function borderCue(firstNote, secondNote) {
  const noteDuration = 0.07;
  const buffer = new Float64Array(seconds(2 * noteDuration));
  [firstNote, secondNote].forEach((frequency, i) => {
    const tone = sweep(() => frequency);
    addEvent(buffer, i * noteDuration, noteDuration, (t) => {
      const envelope = Math.min(1, t / 0.005) * Math.min(1, (noteDuration - t) / 0.03);
      return envelope * tone(t);
    });
  });
  return buffer;
}

const enter = () => borderCue(660, 990);
const leave = () => borderCue(660, 440);

const files = {
  'sounds/hum': hum,
  'sounds/scythe': scythe,
  'sounds/drum': drum,
  'cues/enter': enter,
  'cues/leave': leave,
};
for (const [name, generate] of Object.entries(files)) {
  const path = join(ASSETS_DIR, `${name}.wav`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeWav(normalize(generate())));
  console.log(`assets/${name}.wav`);
}
