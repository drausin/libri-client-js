'use strict';

const webcrypto = window.crypto.subtle;

/**
 * Encrypt a given page's plaintext.
 *
 * @param {Promise.<CryptoKey>} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} plaintext - bytes to encrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @returns {Promise.<ArrayBuffer>} - ciphertext
 */
function encrypt(aesKey, ivSeed, plaintext, pageIndex) {
  return Promise.all([
    aesKey,
    generatePageIV(ivSeed, pageIndex),
  ]).then(function (keys) {
    return webcrypto.encrypt({name: "AES-GCM", iv: keys[1]}, keys[0], plaintext)
  })
}

/**
 * Decrypt a given page's ciphertext.
 *
 * @param {Promise.<CryptoKey>} aesKey - key for AES-GCM cipher
 * @param {ArrayBuffer} ivSeed - initialization vector seed the page's actual IV
 * @param {ArrayBuffer} ciphertext - bytes to decrypt
 * @param {Number} pageIndex - index of the page to encrypt
 * @returns {Promise.<ArrayBuffer>} - plaintext
 */
function decrypt(aesKey, ivSeed, ciphertext, pageIndex) {
  return Promise.all([
    aesKey,
    generatePageIV(ivSeed, pageIndex),
  ]).then(function (keys) {
    return webcrypto.decrypt(
        {name: "AES-GCM", iv: keys[1]},
        keys[0],
        ciphertext,
    )
  })
}

/**
 * Calculate the SHA-256 HMAC of a message with a given key.
 *
 * @param {Promise.<CryptoKey>} key - key to use for HMAC
 * @param {ArrayBuffer} message - the message to digest
 * @returns {Promise.<ArrayBuffer>} - message HMAC
 */
function hmac(key, message) {
  return key.then(function (wcKey) {
    return webcrypto.sign({name: "HMAC"}, wcKey, message)
  })
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
  const ivSeedKey = webcrypto.importKey(
      "raw",
      ivSeed,
      {name: "HMAC", hash: {name: "SHA-256"}},
      false,
      ["sign"]
  );
  return hmac(ivSeedKey, pageIndexBytes)
}

export {
  encrypt,
  decrypt,
  hmac,
}
