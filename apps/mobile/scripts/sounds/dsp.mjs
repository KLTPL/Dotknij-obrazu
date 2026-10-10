// Building blocks shared by all sound recipes.
export const SAMPLE_RATE = 22050;

export const seconds = (duration) => Math.round(duration * SAMPLE_RATE);

// Deterministic PRNG so regenerated files are byte-identical
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard two-pole filter (RBJ cookbook); returns a function processing one sample at a time
export function biquad(type, frequency, q = 0.707) {
  const w = (2 * Math.PI * frequency) / SAMPLE_RATE;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'highpass') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha]; // bandpass
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    return y;
  };
}

// White noise shaped by a filter, e.g. noise(random, biquad('bandpass', 900, 2))
export function noise(random, filter = (x) => x) {
  return () => filter(random() * 2 - 1);
}

// Continuous texture that loops without a seam: the tail is crossfaded into the head
export function seamlessLoop(duration, nextSample, fadeDuration = 0.2) {
  const length = seconds(duration);
  const fade = seconds(fadeDuration);
  const raw = Float64Array.from({ length: length + fade }, nextSample);
  return Float64Array.from({ length }, (_, i) => {
    if (i >= fade) return raw[i];
    const k = i / fade;
    return raw[i] * k + raw[length + i] * (1 - k);
  });
}

// Slow volume swell whose period divides the loop, so it also repeats seamlessly
export function swell(buffer, cycles, depth, phase = 0) {
  return buffer.map((s, i) => s * (1 - depth + depth * (0.5 + 0.5 * Math.sin((2 * Math.PI * cycles * i) / buffer.length + phase))));
}

// Adds a short event into a looping buffer, wrapping around the end
export function addEvent(buffer, start, duration, fn) {
  const first = seconds(start);
  const length = seconds(duration);
  for (let i = 0; i < length; i++) {
    buffer[(first + i) % buffer.length] += fn(i / SAMPLE_RATE);
  }
}

// Sine with a changing pitch needs its phase accumulated sample by sample
export function sweep(frequencyAt) {
  let phase = 0;
  return (t) => {
    phase += (2 * Math.PI * frequencyAt(t)) / SAMPLE_RATE;
    return Math.sin(phase);
  };
}

// Equalizes perceived loudness between very different sounds (noise vs. clicks)
export function normalize(samples, targetRms = 0.18, peakLimit = 0.9) {
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const gain = Math.min(targetRms / rms, peakLimit / peak);
  return samples.map((s) => s * gain);
}

export function encodeWav(samples) {
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
