// @flow

const seedrandom = require('seedrandom');
import * as id from '../common/id';
import * as ecid from '../common/ecid';

/**
 * A collection of ECDSA private keys.
 */
export class Keychain {
  privs: {[string]: ecid.ID};
  pubs: string[];
  rng: seedrandom;

  /**
   * @param {ecid.ID[]} ecids - ECIDs in readerKeys
   */
  constructor(ecids: ecid.ID[]) {
    let privs = {};
    let pubs = [];
    for (let i = 0; i < ecids.length; i++) {
      pubs[i] = id.hex(ecids[i].pubKeyBytes);
      privs[pubs[i]] = ecids[i];
    }
    this.privs = privs;
    this.pubs = pubs;
    this.rng = seedrandom(pubs.length);
  }

  /**
   * Get the key with the given public key, if it exists.
   *
   * @param {ecid.ID} publicKey - public key bytes (uncompressed)
   * @return {ecid.ID}
   */
  get(publicKey: Uint8Array): ecid.ID {
    const value = this.privs[id.hex(publicKey)];
    if (value !== undefined) {
      return value;
    }
    return null;
  }

  /**
   * Sample a key uniformly from the collection.
   *
   * @return {ecid.ID}
   */
  sample(): ecid.ID {
    const i = Math.floor(this.rng() * this.pubs.length);
    return this.privs[this.pubs[i]];
  }
}

/**
 * Create a new {Keychain} with n individual keys.
 *
 * @param {number} n - number of keys to create
 * @return {Keychain}
 */
export function newKeychain(n: number): Keychain {
  let ecids = [];
  for (let i = 0; i < n; i++) {
    ecids[i] = ecid.newRandom();
  }
  return new Keychain(ecids);
}

// TODO (drausin)
// - save
// - load
