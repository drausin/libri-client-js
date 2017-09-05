'use strict';

const webcrypto = window.crypto.subtle;

/**
 * Encrypt a given page's plaintext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} plaintext - bytes to encrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @returns {Promise.<ArrayBuffer>} - ciphertext
 */
function encrypt(aesKey, ivSeed, plaintext, pageIndex) {
  return generatePageIV(ivSeed, pageIndex).then(pageIV => {
    return webcrypto.encrypt({name: "AES-GCM", iv: pageIV}, aesKey, plaintext)
  })
}

/**
 * Decrypt a given page's ciphertext.
 *
 * @param {CryptoKey} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} ciphertext - bytes to decrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @returns {Promise.<ArrayBuffer>} - plaintext
 */
function decrypt(aesKey, ivSeed, ciphertext, pageIndex) {
  return generatePageIV(ivSeed, pageIndex).then(pageIV => {
    return webcrypto.decrypt(
        {name: "AES-GCM", iv: pageIV},
        aesKey,
        ciphertext,
    )
  })
}

/**
 * Calculate the SHA-256 HMAC of a message with a given key.
 *
 * @param {CryptoKey} key - key to use for HMAC
 * @param {ArrayBuffer} message - the message to digest
 * @returns {Promise.<ArrayBuffer>} - message HMAC
 */
function hmac(key, message) {
  return webcrypto.sign({name: "HMAC"}, key, message)
}

/**
 * Generate initialization vector for the AES-GCM cipher for a particular page.
 *
 * @param {ArrayBuffer} ivSeed - initialization vector seed
 * @param pageIndex - index of page in entry
 * @returns {Promise.<ArrayBuffer>} - initialization vector for page
 */
function generatePageIV(ivSeed, pageIndex) {
  // big-endian encoding of 32-bit unsigned integer
  const pageIndexBytes = new Uint8Array([
    (pageIndex >> 24) & 255,
    (pageIndex >> 16) & 255,
    (pageIndex >> 8) & 255,
    pageIndex & 255,
  ]).buffer;
  return webcrypto.importKey(
      "raw",
      ivSeed,
      {name: "HMAC", hash: {name: "SHA-256"}},
      false,
      ["sign"]
  ).then((ivSeedKey) => {
    return hmac(ivSeedKey, pageIndexBytes)
  });
}

export {
  encrypt,
  decrypt,
  hmac,
}
