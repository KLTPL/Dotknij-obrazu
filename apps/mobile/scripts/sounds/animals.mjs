import { addEvent, biquad, mulberry32, seconds, sweep } from './dsp.mjs';

// Canter: three hoof beats per stride, low thump plus a dull click
export function horse() {
  const random = mulberry32(1);
  const buffer = new Float64Array(seconds(1.5));
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
  return buffer;
}

// Song bird: a run of rising chirps followed by a short twitter
export function bird() {
  const buffer = new Float64Array(seconds(2));
  const chirp = (from, to, duration) => {
    const tone = sweep((t) => from + ((to - from) * t) / duration + 120 * Math.sin(2 * Math.PI * 35 * t));
    return (t) => tone(t) * Math.sin((Math.PI * t) / duration) ** 2;
  };
  [0, 0.17, 0.34].forEach((start) => addEvent(buffer, start, 0.09, chirp(2800, 4600, 0.09)));
  [0.95, 1.03, 1.11, 1.19].forEach((start) => addEvent(buffer, start, 0.05, chirp(4200, 3300, 0.05)));
  return buffer;
}

// A voiced call: a buzzy falling tone mixed with noise, shaped by two mouth resonances
function call(random, { from, to, duration, rasp, formants, breath }) {
  const filters = formants.map((frequency) => biquad('bandpass', frequency, 4));
  let phase = 0;
  return (t) => {
    const progress = t / duration;
    phase += (from + (to - from) * progress) / 22050;
    const buzz = 2 * (phase % 1) - 1; // sawtooth, rich in harmonics like vocal cords
    const roughness = rasp ? 0.55 + 0.45 * Math.sign(Math.sin(2 * Math.PI * rasp * t)) : 1;
    const source = buzz * roughness + breath * (random() * 2 - 1);
    const envelope = Math.min(1, t / 0.012) * Math.min(1, (duration - t) / (duration * 0.45));
    return envelope * filters.reduce((sum, filter) => sum + filter(source), 0);
  };
}

// Crow: three harsh, raspy caws; the loop is short so the pause between calls stays brief
export function crow() {
  const random = mulberry32(11);
  const buffer = new Float64Array(seconds(1.5));
  [0, 0.45, 0.9].forEach((start, i) => {
    const caw = { from: 560 - 20 * i, to: 430, duration: 0.33, rasp: 68, formants: [1500, 2500], breath: 0.5 };
    addEvent(buffer, start, caw.duration, call(random, caw));
  });
  return buffer;
}

// Hunting dogs: a double bark, answered by a double bark from a bigger, lower dog
export function dogs() {
  const random = mulberry32(5);
  const buffer = new Float64Array(seconds(1.3));
  const bark = (from, formants) => ({ from, to: from * 0.55, duration: 0.15, rasp: 0, formants, breath: 0.7 });
  addEvent(buffer, 0, 0.15, call(random, bark(520, [850, 1500])));
  addEvent(buffer, 0.24, 0.15, call(random, bark(500, [850, 1500])));
  addEvent(buffer, 0.6, 0.18, call(random, { ...bark(340, [600, 1150]), duration: 0.18 }));
  addEvent(buffer, 0.86, 0.18, call(random, { ...bark(330, [600, 1150]), duration: 0.18 }));
  return buffer;
}
