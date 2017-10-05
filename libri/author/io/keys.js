// @flow

import {ec as EC} from 'elliptic';
import * as hkdf from '../../common/hkdf';

const curve = new EC('secp256k1');
const KeyPair = EC.KeyPair;

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

const kekLength = aesKeyLength + blockCipherIVLength + hmacKeyLength;

/**
 * Container for EEK ciphertext and MAC.
 */
export class EncryptedEEK {
  ciphertext: ArrayBuffer; // TODO (drausin) convert to Uint8Array
  ciphertextMAC: ArrayBuffer;

  /**
   * @param {ArrayBuffer} ciphertext
   * @param {ArrayBuffer} ciphertextMac
   */
  constructor(ciphertext: ArrayBuffer, ciphertextMac: ArrayBuffer) {
    this.ciphertext = ciphertext;
    this.ciphertextMAC = ciphertextMac;
  }
}

/**
 * KEK (key encryption keys) are used to encrypt an EEK.
 */
export class KEK {
  aesKey: window.crypto.subtle.CryptoKey;
  iv: ArrayBuffer;
  hmacKey: window.crypto.subtle.CryptoKey;

  /**
   * @param {CryptoKey} aesKey - 32-byte AES-256 key used to encrypt the EEK
   * @param {ArrayBuffer} iv - 32-byte block cipher initialization vector (IV)
   * seed
   * @param {CryptoKey} hmacKey - 32-byte key used for the EEK ciphertext
   * HMAC-256
   */
  constructor(aesKey: window.crypto.subtle.CryptoKey,
      iv: ArrayBuffer,
      hmacKey: window.crypto.subtle.CryptoKey) {
    this.aesKey = aesKey;
    this.iv = iv;
    this.hmacKey = hmacKey;
  }

  /**
   * Encrypt an EEK.
   *
   * @param {EEK} eek - EEK to encrypt
   * @return {Promise.<EncryptedEEK>}
   */
  encrypt(eek: EEK): Promise<EncryptedEEK> {
    const ciphertextP = marshallEEK(eek).then((eekBytes) => {
      return webcrypto.encrypt(
          {name: 'AES-GCM', iv: this.iv},
          this.aesKey,
          eekBytes,
      );
    });
    const ciphertextMacP = ciphertextP.then((ciphertext) => {
      return webcrypto.sign({name: 'HMAC'}, this.hmacKey, ciphertext);
    });
    return Promise.all([ciphertextP, ciphertextMacP]).then((args) => {
      return new EncryptedEEK(args[0], args[1]);
    });
  }

  /**
   * Decrypt an encrypted EEK.
   *
   * @param {Uint8Array} ciphertext - EEK ciphertext
   * @param {Uint8Array} ciphertextMAC - EEK ciphertext MAC
   * @return {Promise.<EEK>}
   */
  decrypt(ciphertext: Uint8Array, ciphertextMAC: Uint8Array): Promise<EEK> {
    return webcrypto.verify(
        {name: 'HMAC'},
        this.hmacKey,
        ciphertextMAC,
        ciphertext,
    ).then((isValid) => {
      if (!isValid) {
        throw new Error('unexpected EEK MAC');
      }
    }).then(() => {
      return webcrypto.decrypt(
          {name: 'AES-GCM', iv: this.iv},
          this.aesKey,
          ciphertext,
      );
    }).then((eekBytes) => {
      return unmarshalEEK(new Uint8Array(eekBytes));
    });
  }
}

/**
 * Construct a new KEK from the DH shared secret of an EC private and public
 * key pair.
 *
 * @param {KeyPair} priv - private key
 * @param {Uint8Array} pubBytes - public key bytes (in uncompressed form)
 * @return {Promise.<KEK>}
 */
export function newKEK(priv: KeyPair, pubBytes: Uint8Array): Promise<KEK> {
  const pub = curve.keyFromPublic(pubBytes).getPublic();
  const secret = new Uint8Array(priv.derive(pub).toArray()); // DH shared secret

  const kdf = new hkdf.HKDF('SHA-256', secret, null);
  return kdf.derive(kekLength).then((kekBytes) => {
    return unmarshalKEK(kekBytes);
  });
}

/**
 * Marshal a KEK object to a byte representation.
 *
 * @param {KEK} kekKey - KEK object to marshal
 * @return {Promise.<Uint8Array>}
 */
export function marshallKEK(kekKey: KEK): Promise<Uint8Array> {
  const aesKeyBytes = webcrypto.exportKey('raw', kekKey.aesKey);
  const hmacKeyBytes = webcrypto.exportKey('raw', kekKey.hmacKey);

  return Promise.all([aesKeyBytes, hmacKeyBytes]).then((args) => {
    let offset = 0;
    const kekBytes = new Uint8Array(kekLength);
    kekBytes.set(args[0], offset);
    offset += aesKeyLength;
    kekBytes.set(new Uint8Array(kekKey.iv), offset);
    offset += blockCipherIVLength;
    kekBytes.set(args[1], offset);
    return kekBytes;
  });
}

/**
 * Unmarshal a KEK byte representation to an object.
 *
 * @param {Uint8Array} kekBytes - KEK byte representation to unmarshal
 * @return {Promise.<KEK>}
 */
export function unmarshalKEK(kekBytes: Uint8Array): Promise<KEK> {
  if (kekBytes.length !== kekLength) {
    throw new Error('marshalled KEK length (' + kekBytes.length + ') '
        + 'does not match expected size (' + kekLength + ')');
  }
  let offset = 0;
  const aesKey = webcrypto.importKey(
      'raw',
      kekBytes.slice(offset, offset + aesKeyLength),
      {name: 'AES-GCM'},
      true,
      ['encrypt', 'decrypt']
  );
  offset += aesKeyLength;
  const iv = kekBytes.slice(offset, offset + blockCipherIVLength).buffer;
  offset += blockCipherIVLength;
  const hmacKey = webcrypto.importKey(
      'raw',
      kekBytes.slice(offset, offset + hmacKeyLength),
      {name: 'HMAC', hash: {name: 'SHA-256'}},
      true,
      ['sign', 'verify']
  );

  return Promise.all([aesKey, hmacKey]).then((args) => {
    return new KEK(args[0], iv, args[1]);
  });
}

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
 * Generated a new, random entryDocKey encryption key (EEK) using
 * window.crypto's random value generator.
 *
 * @return {Promise.<EEK>}
 */
export function newEEK(): Promise<EEK> {
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
