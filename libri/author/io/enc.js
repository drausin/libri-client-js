// @flow

import {EntryMetadata} from '../../librarian/api/documents_pb';
import {EEK} from './keys';
const webcrypto = window.crypto.subtle;

/**
 * Encrypt a given page's plaintext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} plaintext - bytes to encrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @return {Promise.<ArrayBuffer>} - ciphertext
 * @public
 */
export function encryptPage(aesKey: window.crypto.subtle.CryptoKey,
    ivSeed: ArrayBuffer,
    plaintext: ArrayBuffer,
    pageIndex: number): Promise<ArrayBuffer> {
  return generatePageIV(ivSeed, pageIndex).then((pageIV) => {
    return webcrypto.encrypt({name: 'AES-GCM', iv: pageIV}, aesKey, plaintext);
  });
}

/**
 * Decrypt a given page's ciphertext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} ciphertext - bytes to decryptPage
 * @param {Number} pageIndex - index of the page to encrypt
 * @return {Promise.<ArrayBuffer>} - plaintext
 * @public
 */
export function decryptPage(aesKey: window.crypto.subtle.CryptoKey,
    ivSeed: ArrayBuffer,
    ciphertext: ArrayBuffer,
    pageIndex: number): Promise<ArrayBuffer> {
  return generatePageIV(ivSeed, pageIndex).then((pageIV) => {
    return webcrypto.decrypt(
        {name: 'AES-GCM', iv: pageIV},
        aesKey,
        ciphertext,
    );
  });
}

/**
 * Calculate the SHA-256 HMAC of a message with a given key.
 *
 * @param {CryptoKey} key - key to use for HMAC
 * @param {ArrayBuffer} message - the message to digest
 * @return {Promise.<ArrayBuffer>} - message HMAC
 * @public
 */
export function hmac(key: window.crypto.subtle.CryptoKey,
    message: ArrayBuffer): Promise<ArrayBuffer> {
  return webcrypto.sign({name: 'HMAC'}, key, message);
}

/**
 * Container for the encrypted api.Metadata of a entryDocKey.
 */
export class EncryptedMetadata {
  ciphertext: ArrayBuffer;
  ciphertextMAC: ArrayBuffer;

  /**
   * @param {ArrayBuffer} ciphertext - encrypted serialized docs.Metadata
   * @param {ArrayBuffer} ciphertextMAC - MAC of ciphertext
   */
  constructor(ciphertext: ArrayBuffer, ciphertextMAC: ArrayBuffer) {
    this.ciphertext = ciphertext;
    this.ciphertextMAC = ciphertextMAC;
  }
}

/**
 * Encrypt a docs.EntryMetadata instance.
 *
 * @param {EntryMetadata} metadata - metadata to encrypt
 * @param {EEK} keys - EEK to use for encryption
 * @return {Promise.<EncryptedMetadata>} - encrypted metadata
 */
export function encryptMetadata(metadata: EntryMetadata,
    keys: EEK): Promise<EncryptedMetadata> {
  const plaintext = metadata.serializeBinary();
  const ciphertextP = webcrypto.encrypt(
      {name: 'AES-GCM', iv: keys.metadataIV},
      keys.aesKey,
      plaintext,
  );
  const ciphertextMacP = ciphertextP.then((ciphertext) => {
    return hmac(keys.hmacKey, ciphertext);
  });
  return Promise.all([ciphertextP, ciphertextMacP]).then((args) => {
    return new EncryptedMetadata(args[0], args[1]);
  });
}

/**
 * Decrypt an EncryptedMetadata instance.
 *
 * @param {EncryptedMetadata} encMetadata - encrypted metadata to decryptPage
 * @param {EEK} keys - EEK to use for decryption
 * @return {Promise.<EntryMetadata>}
 */
export function decryptMetadata(encMetadata: EncryptedMetadata,
    keys: EEK): Promise<EntryMetadata> {
  return webcrypto.verify(
      {name: 'HMAC'},
      keys.hmacKey,
      encMetadata.ciphertextMAC,
      encMetadata.ciphertext,
  ).then((isValid) => {
    if (!isValid) {
      throw new Error('unexpected metadata MAC');
    }
  }).then(() => {
    return webcrypto.decrypt(
        {name: 'AES-GCM', iv: keys.metadataIV},
        keys.aesKey,
        encMetadata.ciphertext,
    );
  }).then((plaintext) => {
    return EntryMetadata.deserializeBinary(plaintext);
  });
}

/**
 * Generate initialization vector for the AES-GCM cipher for a particular page.
 *
 * @param {ArrayBuffer} ivSeed - initialization vector seed
 * @param {Integer} pageIndex - index of page in entryDocKey
 * @return {Promise.<ArrayBuffer>} - initialization vector for page
 * @private
 */
function generatePageIV(ivSeed: ArrayBuffer,
    pageIndex: number): Promise<ArrayBuffer> {
  const pageIndexBytes = new Uint8Array([
    // big-endian encoding of 32-bit unsigned integer
    (pageIndex >> 24) & 255,
    (pageIndex >> 16) & 255,
    (pageIndex >> 8) & 255,
    pageIndex & 255,
  ]).buffer;
  return webcrypto.importKey(
      'raw',
      ivSeed,
      {name: 'HMAC', hash: {name: 'SHA-256'}},
      false,
      ['sign']
  ).then((ivSeedKey) => {
    return hmac(ivSeedKey, pageIndexBytes);
  });
}
