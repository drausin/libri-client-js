// @flow

// This implementation is inspired by
// https://github.com/rylanhalteman/node-hkdf-sync but using HMAC
// from WebCrypto API instead of Node's crypto package.
//
// original RFC spec: https://tools.ietf.org/html/rfc5869

const webcrypto = window.crypto.subtle;

/**
 * HMAC-based key derivation function using webcrypto API.
 */
export class HKDF {
  keyP: Promise<window.crypto.subtle.CryptoKey>;
  hashLen: number;

  /**
   * @param {string} hashAlg - hash algorithm (e.g, 'SHA-256') to use
   * @param {Uint8Array} ikm - initial keying material
   * @param {Uint8Array} salt - (optional) salt for pseudo-random key
   */
  constructor(hashAlg: string, ikm: Uint8Array, salt: Uint8Array|null) {
    this.hashLen = hashLen(hashAlg);
    if (salt === undefined || salt === null) {
      salt = new Uint8Array(this.hashLen);
    }

    // step 1: extract pseudorandom key (prk) from salt + initial keying
    // material
    this.keyP = webcrypto.importKey(
        'raw',
        salt,
        {name: 'HMAC', hash: {name: hashAlg}},
        false,
        ['sign']
    ).then((saltKey) => {
      return webcrypto.sign({name: 'HMAC'}, saltKey, ikm);
    }).then((prk) => {
      return webcrypto.importKey(
          'raw',
          prk,
          {name: 'HMAC', hash: {name: hashAlg}},
          false,
          ['sign']
      );
    });
  }

  /**
   * Derive a given number of random bytes.
   *
   * @param {number} length - random bytes to derive
   * @param {Uint8Array} info - (optional) additional context/info to add to
   * derivation
   * @return {Promise.<Uint8Array>} - derived bytes
   */
  derive(length: number,
      info: Uint8Array = new Uint8Array(0)): Promise<Uint8Array> {
    const out = new Uint8Array(length);
    const nBlocks = Math.ceil(length / this.hashLen);

    let prevP = new Promise((resolve, _) => {
      resolve(new Uint8Array(0));
    });
    for (let c = 1; c <= nBlocks; c++) {
      // build input: prev | info | c
      const inputP = prevP.then((prev) => {
        const input = new Uint8Array(prev.length + info.length + 1);
        input.set(prev);
        input.set(info, prev.length);
        input.set([c], prev.length + info.length);
        return input;
      });
      prevP = Promise.all([inputP, this.keyP]).then((args) => {
        return webcrypto.sign({name: 'HMAC'}, args[1], args[0].buffer);
      }).then((blockBuff) => {
        const block = new Uint8Array(blockBuff);
        const offset = (c - 1) * this.hashLen;
        if (c < nBlocks) {
          out.set(block, offset);
        } else {
          out.set(block.subarray(0, length - offset), offset);
        }
        return block;
      });
    }
    return prevP.then((_) => {
      return out;
    });
  }
}

/**
 * Get the (byte) length of a given hash algorithm's output. For now it's
 * simplest just to hard-code.
 *
 * @param {string} hashAlg - hash algorithm
 * @return {number}
 */
function hashLen(hashAlg: string): number {
  if (hashAlg === 'SHA-256') {
    return 32;
  }
  throw new Error('unknown hash length for algorithm ' + hashAlg);
}
