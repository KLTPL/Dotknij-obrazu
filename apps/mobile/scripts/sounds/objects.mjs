import { addEvent, biquad, mulberry32, noise, seamlessLoop, seconds, sweep } from './dsp.mjs';

// A knock on wood: three resonances of a board, each dying out faster than the lower one
const woodHit = (pitch) => (t) =>
  Math.sin(2 * Math.PI * 190 * pitch * t) * Math.exp(-t / 0.04) +
  0.6 * Math.sin(2 * Math.PI * 430 * pitch * t) * Math.exp(-t / 0.022) +
  0.4 * Math.sin(2 * Math.PI * 960 * pitch * t) * Math.exp(-t / 0.01);

// Table: knuckles rapping on a wooden top, "knock-knock-knock ... knock-knock"
export function knock() {
  const buffer = new Float64Array(seconds(1.2));
  [0, 0.17, 0.34, 0.68, 0.85].forEach((start, i) => addEvent(buffer, start, 0.2, woodHit(i === 2 || i === 4 ? 1.08 : 1)));
  return buffer;
}

// Wooden cart on a rough road: rattling rumble, loose boards clacking and a squeaking axle
export function cart() {
  const random = mulberry32(88);
  const duration = 2;
  const rumble = seamlessLoop(duration, noise(random, biquad('lowpass', 140, 1)));
  // 12 rattles per second, a whole number per loop so the rhythm does not jump at the seam
  const buffer = rumble.map((s, i) => 3 * s * (0.55 + 0.45 * Math.sin((2 * Math.PI * 24 * i) / rumble.length)));
  for (let i = 0; i < 14; i++) {
    const hit = woodHit(1.6 + random() * 1.4);
    const level = 0.25 + random() * 0.35;
    addEvent(buffer, random() * duration, 0.08, (t) => level * hit(t));
  }
  [0.3, 1.3].forEach((start) => {
    const squeak = sweep((t) => 1250 + 500 * Math.sin((Math.PI * t) / 0.22) + 40 * Math.sin(2 * Math.PI * 90 * t));
    addEvent(buffer, start, 0.22, (t) => 0.18 * squeak(t) * Math.sin((Math.PI * t) / 0.22));
  });
  return buffer;
}

// Bread crust: three bites, each a burst of tiny dry cracks that thins out
export function crunch() {
  const random = mulberry32(99);
  const buffer = new Float64Array(seconds(1.5));
  [0, 0.5, 1.0].forEach((bite) => {
    for (let i = 0; i < 45; i++) {
      // Squaring the random number packs most cracks into the start of the bite
      const offset = random() ** 2 * 0.35;
      const crack = noise(random, biquad('bandpass', 1800 + random() * 2600, 5));
      const level = 0.5 + random();
      addEvent(buffer, bite + offset, 0.02, (t) => level * crack() * Math.exp(-t / 0.006));
    }
  });
  return buffer;
}

// A woman humming four slow notes; soft harmonics and vibrato make the tone voice-like
export function hum() {
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
