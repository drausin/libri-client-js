// @flow

const webcrypto = window.crypto.subtle;

/**
 * Encrypt a given page's plaintext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} plaintext - bytes to encrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @return {Promise.<ArrayBuffer>} - ciphertext
 */
function encrypt(
    aesKey: window.crypto.subtle.CryptoKey,
    ivSeed: ArrayBuffer,
    plaintext: ArrayBuffer,
    pageIndex: number,
): Promise<ArrayBuffer> {
  return generatePageIV(ivSeed, pageIndex).then((pageIV) => {
    return webcrypto.encrypt({name: 'AES-GCM', iv: pageIV}, aesKey, plaintext);
  });
}

/**
 * Decrypt a given page's ciphertext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} ciphertext - bytes to decrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @return {Promise.<ArrayBuffer>} - plaintext
 * @public
 */
function decrypt(
    aesKey: window.crypto.subtle.CryptoKey,
    ivSeed: ArrayBuffer,
    ciphertext: ArrayBuffer,
    pageIndex: number,
): Promise<ArrayBuffer> {
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
function hmac(
    key: window.crypto.subtle.CryptoKey,
    message: ArrayBuffer,
): Promise<ArrayBuffer> {
  return webcrypto.sign({name: 'HMAC'}, key, message);
}
//
// class EncryptedMetadata {}
//
// function encryptMetadata() {}
//
// function decryptMetadata() {}

/**
 * Generate initialization vector for the AES-GCM cipher for a particular page.
 *
 * @param {ArrayBuffer} ivSeed - initialization vector seed
 * @param {Integer} pageIndex - index of page in entry
 * @return {Promise.<ArrayBuffer>} - initialization vector for page
 * @private
 */
function generatePageIV(
    ivSeed: ArrayBuffer,
    pageIndex: number,
): Promise<ArrayBuffer> {
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

export {
  encrypt,
  decrypt,
  hmac,
};
