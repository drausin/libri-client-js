
import {ec as EC} from 'elliptic';
import * as id from './id';
import * as bn from 'bn.js';

const curve = new EC('secp256k1');
const KeyPair = EC.KeyPair;

/**
 * ID is an elliptic curve identifier, where the ID is the x-value of the (x, y)
 * public key point on the curve. When coupled with the private key, this
 * allows something (e.g., a libri peer) to sign messages that a receiver can
 * verify.
 */
export class ID {
  key: KeyPair;
  pubId: id.ID; // redundant id.ID from public key X value
  pubKeyBytes: Uint8Array;

  /**
   * @param {KeyPair} key - public + private EC key pair
   */
  constructor(key: KeyPair) {
    this.key = key;
    const pub = key.getPublic();
    const pubKeyXBytes = new Uint8Array(pub.getX().toArray());
    this.pubId = new id.ID(pubKeyXBytes);
    this.pubKeyBytes = new Uint8Array(pub.encode());
  }
}

/**
 * Generate a new random ID.
 *
 * @return {ID}
 */
export function newRandom(): ID {
  const entropy = new Uint8Array(32);
  window.crypto.getRandomValues(entropy);
  return new ID(curve.genKeyPair({'entropy': entropy}));
}

/**
 * Create a new ID from an ECDSA private key.
 * @param {bn.js.BN} priv - private key
 * @return {ID}
 */
export function fromPrivateKey(priv: bn.BN): ID {
  const keyPair = curve.keyFromPrivate(priv);
  return new ID(keyPair);
}
