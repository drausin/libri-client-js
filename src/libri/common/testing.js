// @flow

import 'seedrandom';

// $FlowFixMe
const seedrandom = Math.seedrandom;

/**
 * Generate a random sequence of compressible bytes of a given length.
 * @param {seedrandom} rng - random number generator
 * @param {integer} length - length of byte array to generate
 * @return {Uint8Array} - random sequence of compressible bytes
 * @public
 */
export function newCompressibleBytes(rng: seedrandom,
    length: number): Uint8Array {
  const words = [
    new Uint8Array([0, 0, 0, 0]),
    new Uint8Array([1, 1, 1, 1, 1, 1]),
    new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2]),
    new Uint8Array([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
    new Uint8Array([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
  ];
  let bytes = new Uint8Array(length);
  let offset = 0;
  while (offset < bytes.length) {
    const i = Math.floor(rng() * words.length);
    if (offset + words[i].length > length) {
      bytes.set(words[i].slice(0, length - offset), offset);
      offset += length - offset;
    } else {
      bytes.set(words[i], offset);
      offset += words[i].length;
    }
  }
  return bytes;
}
