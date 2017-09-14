// @flow

const webcrypto = window.crypto.subtle;

// AESKeyLength is the byte length of an AES-256 encryption key.
const aesKeyLength = 32;

// PageIVSeedLength is the byte length of the Page block cipher initialization
// vector (IV) seed.
const pageIVSeedLength = 32;

// HMACKeyLength is the byte length of the Page HMAC-256 key.
const hmacKeyLength = 32;

// BlockCipherIVLength is the byte length of a block cipher initialization
// vector.
const blockCipherIVLength = 12;

const eekLength = aesKeyLength + pageIVSeedLength + hmacKeyLength +
    blockCipherIVLength;

/**
 * Entry encryption keys (EEK) are are used to encrypt an Entry and its Pages.
 */
export class EEK {
  aesKey: window.crypto.subtle.CryptoKey;
  pageIVSeed: ArrayBuffer;
  hmacKey: window.crypto.subtle.CryptoKey;
  metadataIV: ArrayBuffer;

  /**
   * @param {CryptoKey} aesKey - 32-byte AES-256 key used to encrypt Pages and
   * Entry metadata
   * @param {ArrayBuffer} pageIVSeed - 32-byte block cipher initialization
   * vector (IV) seed for Page enc
   * @param {CryptoKey} hmacKey - 32-byte key used for Page HMAC-256
   * calculations
   * @param {ArrayBuffer} metadataIV - 12-byte IV for the Entry metadata block
   * cipher
   */
  constructor(aesKey: window.crypto.subtle.CryptoKey,
      pageIVSeed: ArrayBuffer,
      hmacKey: window.crypto.subtle.CryptoKey,
      metadataIV: ArrayBuffer) {
    this.aesKey = aesKey;
    this.pageIVSeed = pageIVSeed;
    this.hmacKey = hmacKey;
    this.metadataIV = metadataIV;
  }
}

/**
 * Generated a new, random entryDocKey encryption key (EEK) using window.crypto's
 * random value generator.
 *
 * @return {Promise.<EEK>}
 */
export function newEEK() {
  const unmarshalled = new Uint8Array(eekLength);
  window.crypto.getRandomValues(unmarshalled);
  return unmarshalEEK(unmarshalled);
}

/**
 * Marshall an EEK key to its byte representation.
 *
 * @param {EEK} eekKey - EEK to marshall
 * @return {Promise.<Uint8Array>} - marshalled EEK byte representation
 */
export function marshallEEK(eekKey: EEK): Promise<Uint8Array> {
  const aesKeyBytes = webcrypto.exportKey('raw', eekKey.aesKey);
  const hmacKeyBytes = webcrypto.exportKey('raw', eekKey.hmacKey);

  return Promise.all([aesKeyBytes, hmacKeyBytes]).then((args) => {
    let offset = 0;
    const eekBytes = new Uint8Array(eekLength);
    eekBytes.set(args[0], offset);
    offset += aesKeyLength;
    eekBytes.set(new Uint8Array(eekKey.pageIVSeed), offset);
    offset += pageIVSeedLength;
    eekBytes.set(args[1], offset);
    offset += hmacKeyLength;
    eekBytes.set(new Uint8Array(eekKey.metadataIV), offset);
    return eekBytes;
  });
}

/**
 * Unmarshall an EEK byte representation to an object.
 *
 * @param {Uint8Array} eekBytes - marshalled EEK bytes
 * @return {Promise.<EEK>} - unmarshalled EEK object
 */
export function unmarshalEEK(eekBytes: Uint8Array): Promise<EEK> {
  if (eekBytes.length !== eekLength) {
    throw new Error('marshalled EEK length (' + eekBytes.length + ') '
        + 'does not match expected size (' + eekLength + ')');
  }
  let offset = 0;
  const aesKey = webcrypto.importKey(
      'raw',
      eekBytes.slice(offset, offset + aesKeyLength),
      {name: 'AES-GCM'},
      true,
      ['encrypt', 'decrypt']
  );
  offset += aesKeyLength;
  const pageIVSeed = eekBytes.slice(offset, offset + pageIVSeedLength).buffer;
  offset += pageIVSeedLength;
  const hmacKey = webcrypto.importKey(
      'raw',
      eekBytes.slice(offset, offset + hmacKeyLength),
      {name: 'HMAC', hash: {name: 'SHA-256'}},
      true,
      ['sign', 'verify']
  );
  offset += hmacKeyLength;
  const metadataIV =
      eekBytes.slice(offset, offset + blockCipherIVLength).buffer;

  return Promise.all([aesKey, hmacKey]).then((args) => {
    return new EEK(args[0], pageIVSeed, args[1], metadataIV);
  });
}
