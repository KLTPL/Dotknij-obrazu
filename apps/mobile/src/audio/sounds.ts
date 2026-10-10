import type { AudioSource } from 'expo-audio';

/**
 * Looping sounds an artwork object can use, keyed by ArtworkObject.sound.
 * Cut from CC0 recordings by pipeline/sounds.py (see assets/sounds/ATTRIBUTION.md),
 * except for the synthesized ones from scripts/generate-sounds.mjs.
 */
export const SOUNDS: Record<string, AudioSource> = {
  bird: require('../../assets/sounds/bird.wav'),
  cart: require('../../assets/sounds/cart.wav'),
  crow: require('../../assets/sounds/crow.wav'),
  crunch: require('../../assets/sounds/crunch.wav'),
  dogs: require('../../assets/sounds/dogs.wav'),
  fire: require('../../assets/sounds/fire.wav'),
  horse: require('../../assets/sounds/horse.wav'),
  hum: require('../../assets/sounds/hum.wav'),
  knock: require('../../assets/sounds/knock.wav'),
  mud: require('../../assets/sounds/mud.wav'),
  oars: require('../../assets/sounds/oars.wav'),
  pour: require('../../assets/sounds/pour.wav'),
  skates: require('../../assets/sounds/skates.wav'),
  steps: require('../../assets/sounds/steps.wav'),
  water: require('../../assets/sounds/water.wav'),
  waves: require('../../assets/sounds/waves.wav'),
  wind: require('../../assets/sounds/wind.wav'),
};
