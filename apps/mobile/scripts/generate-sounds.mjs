// Synthesizes the sounds we have no recording for into assets/sounds.
// Every other sound is cut from a CC0 recording by pipeline/sounds.py.
// Run: pnpm --filter @repo/mobile sounds
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

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

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, generate] of Object.entries({ hum })) {
  writeFileSync(join(OUT_DIR, `${name}.wav`), encodeWav(normalize(generate())));
  console.log(`assets/sounds/${name}.wav`);
}
