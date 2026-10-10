import { addEvent, biquad, mulberry32, noise, seamlessLoop, seconds, swell, sweep } from './dsp.mjs';

// Stream: low-passed noise with a slow swell and occasional gurgles
export function water() {
  const random = mulberry32(7);
  let lowpassed = 0;
  const hiss = seamlessLoop(2, () => (lowpassed += 0.12 * (random() * 2 - 1 - lowpassed)));
  const buffer = hiss.map((s, i) => s * (0.7 + 0.3 * Math.sin((2 * Math.PI * i) / hiss.length)));
  for (let g = 0; g < 9; g++) {
    const base = 350 + random() * 500;
    const gurgle = sweep((t) => base + 6000 * t);
    addEvent(buffer, random() * 2, 0.04, (t) => 0.35 * gurgle(t) * Math.sin((Math.PI * t) / 0.04));
  }
  return buffer;
}

// Wind: a low rush, a higher layer and a faint whistle, each swelling at its own pace
export function wind() {
  const random = mulberry32(21);
  const duration = 4;
  const rush = swell(seamlessLoop(duration, noise(random, biquad('bandpass', 380, 0.9))), 1, 0.7);
  const gust = swell(seamlessLoop(duration, noise(random, biquad('bandpass', 850, 1.6))), 2, 0.9, 1.3);
  const whistle = swell(seamlessLoop(duration, noise(random, biquad('bandpass', 1700, 9))), 1, 1, 2.6);
  return rush.map((s, i) => s + 0.7 * gust[i] + 0.5 * whistle[i]);
}

// Bonfire: a soft roar with sparse sharp crackles and a few louder pops
export function fire() {
  const random = mulberry32(33);
  const duration = 3;
  const buffer = swell(seamlessLoop(duration, noise(random, biquad('lowpass', 260, 0.7))), 3, 0.4).map((s) => s * 2);
  for (let i = 0; i < 70; i++) {
    const loud = i % 9 === 0;
    const crackle = noise(random, biquad('highpass', loud ? 1200 : 2500, 0.8));
    const level = loud ? 2.2 : 0.4 + random() * 0.9;
    addEvent(buffer, random() * duration, 0.02, (t) => level * crackle() * Math.exp(-t / (loud ? 0.006 : 0.002)));
  }
  return buffer;
}

// Milk poured from a jug: a steady thin trickle with a dense stream of small bubbles
export function pour() {
  const random = mulberry32(44);
  const duration = 2;
  const buffer = seamlessLoop(duration, noise(random, biquad('bandpass', 2600, 1.2))).map((s) => s * 0.6);
  for (let i = 0; i < 90; i++) {
    const base = 900 + random() * 1800;
    const bubble = sweep((t) => base + 9000 * t);
    addEvent(buffer, random() * duration, 0.03, (t) => 0.5 * bubble(t) * Math.sin((Math.PI * t) / 0.03));
  }
  return buffer;
}

// Hooves in mud: wet, dull splashes with a low bubble sucked in after each one
export function mud() {
  const random = mulberry32(55);
  const buffer = new Float64Array(seconds(1.8));
  [0, 0.42, 0.95, 1.3].forEach((start, i) => {
    const splash = noise(random, biquad('lowpass', 700 + 200 * (i % 2), 1.2));
    addEvent(buffer, start, 0.22, (t) => 1.6 * splash() * Math.min(1, t / 0.004) * Math.exp(-t / 0.05));
    const suck = sweep((t) => 260 - 900 * t);
    addEvent(buffer, start + 0.05, 0.12, (t) => 0.8 * suck(t) * Math.sin((Math.PI * t) / 0.12) ** 2);
  });
  return buffer;
}

// Walking in deep snow: every step is a grainy two-part crunch (heel, then toe)
export function steps() {
  const random = mulberry32(66);
  const buffer = new Float64Array(seconds(2.2));
  [0, 0.55, 1.1, 1.65].forEach((start, i) => {
    [0, 0.09].forEach((part) => {
      const crunch = noise(random, biquad('bandpass', 1500 + 300 * (i % 2), 0.7));
      let grain = 1;
      addEvent(buffer, start + part, 0.16, (t) => {
        // The level jumps every few milliseconds, like snow crystals giving way one by one
        if (Math.floor(t * 22050) % 60 === 0) grain = 0.2 + random();
        return grain * crunch() * Math.min(1, t / 0.01) * Math.exp(-t / 0.06);
      });
    });
  });
  return buffer;
}

// Ice skating: long hissing glides, alternating feet, each ending with the blade biting the ice
export function skates() {
  const random = mulberry32(77);
  const buffer = new Float64Array(seconds(3));
  [0, 1.5].forEach((start, i) => {
    const low = noise(random, biquad('bandpass', 3000 + 400 * i, 3));
    const high = noise(random, biquad('bandpass', 5200 + 400 * i, 3));
    addEvent(buffer, start, 1.2, (t) => {
      const progress = t / 1.2;
      // Fading from the lower band to the higher one makes the hiss rise like a real glide
      return Math.sin(Math.PI * progress) ** 2 * ((1 - progress) * low() + progress * high());
    });
    const bite = noise(random, biquad('highpass', 2500, 1));
    addEvent(buffer, start + 1.15, 0.06, (t) => 0.9 * bite() * Math.exp(-t / 0.012));
  });
  return buffer;
}

// Breaking sea wave: a deep roar that builds up, then foam hissing as it collapses
export function waves() {
  const random = mulberry32(111);
  const duration = 4;
  const roar = swell(seamlessLoop(duration, noise(random, biquad('lowpass', 420, 0.8))), 1, 0.9);
  // The foam peaks a quarter of the loop after the roar, like a crest falling over
  const foam = swell(seamlessLoop(duration, noise(random, biquad('highpass', 2200, 0.7))), 1, 1, -Math.PI / 2);
  return roar.map((s, i) => 2.5 * s + 0.6 * foam[i]);
}
