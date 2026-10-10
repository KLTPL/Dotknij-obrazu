const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const VALUE_OF_CHAR = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) VALUE_OF_CHAR[ALPHABET.charCodeAt(i)] = i;

/**
 * Decodes standard padded base64 into bytes. Written by hand so decoding the layers
 * does not depend on `atob` being available in the JS engine.
 */
export function decodeBase64(text: string): Uint8Array {
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((text.length / 4) * 3 - padding);
  let offset = 0;
  for (let i = 0; i < text.length; i += 4) {
    // Four characters carry 6 bits each: 24 bits, so three bytes
    const chunk =
      (VALUE_OF_CHAR[text.charCodeAt(i)] << 18) |
      (VALUE_OF_CHAR[text.charCodeAt(i + 1)] << 12) |
      (VALUE_OF_CHAR[text.charCodeAt(i + 2)] << 6) |
      VALUE_OF_CHAR[text.charCodeAt(i + 3)];
    if (offset < bytes.length) bytes[offset++] = chunk >> 16;
    if (offset < bytes.length) bytes[offset++] = (chunk >> 8) & 0xff;
    if (offset < bytes.length) bytes[offset++] = chunk & 0xff;
  }
  return bytes;
}
