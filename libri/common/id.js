// @flow

export const length = 32;

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

  /**
   * Compare the ID to another ID.
   *
   * @param {ID} other - the other ID to compare this ID to
   * @return {number} - 0 if they are equal, -1 if this ID is less than the
   * other, 1 if it is more
   */
  compare(other: ID): number {
    for (let i = 0; i < this.bytes.length; i++) {
      if (this.bytes[i] < other.bytes[i]) {
        return -1;
      }
      if (this.bytes[i] > other.bytes[i]) {
        return 1;
      }
    }
    return 0;
  }
}

/**
 * Generate a new, random ID.
 *
 * @return {ID} - generated ID
 */
export function newRandom(): ID {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return new ID(bytes);
}

/**
 * Returns the hex string of the value.
 * @param {Uint8Array} value - value to get hex string for
 * @return {string}
 * @public
 */
export function hex(value: Uint8Array): string {
  return Array.prototype.map.call(value,
      (x) => ('00' + x.toString(16)).slice(-2)).join('');
}
