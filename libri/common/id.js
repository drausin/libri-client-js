// @flow

const webcrypto = window.crypto.subtle;
const length = 32;

/**
 * ID is a 32-byte identifier.
 */
export class ID {
  bytes: Uint8Array;

  /**
   * @param {Uint8Array} bytes - ID byte representation
   */
  constructor(bytes: Uint8Array) {
    if (bytes.length !== length) {
      throw new Error('unexpected ID byte length ' + bytes.length);
    }
    this.bytes = bytes;
  }

  /**
   * Get the string representation for the ID.
   *
   * @return {string} - ID's hex value
   */
  string(): string {
    return hex(this.bytes);
  }

  compare(other: ID): number {
    return 0;  // TODO (drausin) populate for real
  }
}

/**
 * Generate a new, random ID.
 *
 * @return {ID} - generated ID
 */
export function newRandom(): ID {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return new ID(bytes);
}

/**
 * Returns the 64-character hex string of the first 32-bytes of the value.
 * @param {Uint8Array} value - value to get hex string for
 * @return {string}
 * @public
 */
export function hex(value: Uint8Array): string {
  return Array.prototype.map.call(value,
      (x) => ('00' + x.toString(16)).slice(-2)).join('');
}
