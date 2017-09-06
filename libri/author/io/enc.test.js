// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const enc = require('./enc');

const webcrypto = window.crypto.subtle;

test('encrypt + decrypt = original', async () => {
  const aesKey = webcrypto.generateKey(
      {name: 'AES-GCM', length: 256},
      true,
      ['encrypt', 'decrypt'],
  );
  const original = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer;
  const ivSeed = new Uint8Array([1, 1, 1, 1, 1]).buffer;
  const nPages = 3;
  expect.assertions(nPages);

  for (let pageIndex = 0; pageIndex < nPages; pageIndex++) {
    await aesKey.then((aesKey2) => {
      return expect(
          enc.encrypt(aesKey2, ivSeed, original, pageIndex).then(
              (ciphertext) => {
                return enc.decrypt(aesKey2, ivSeed, ciphertext, pageIndex);
              }
          )
      ).resolves.toEqual(original);
    });
  }
});

test('hmac gives expected results', () => {
  const message = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
  const key = webcrypto.importKey(
      'raw',
      new Uint8Array([2, 2, 2, 2]).buffer,
      {name: 'HMAC', hash: {name: 'SHA-256'}},
      false,
      ['sign']
  );
  expect.assertions(1);
  return expect(
      key.then((key2) => {
        return enc.hmac(key2, message).then((mac) => {
          return new Uint8Array(mac);
        });
      })
  ).resolves.toEqual(
      /*
       * ground truth verified in python:
       *
       * import hashlib, hmac
       * msg, key = bytearray([0, 1, 2, 3, 4, 5]), bytearray([2, 2, 2, 2])
       * list(bytearray.fromhex(hmac.new(key, msg, hashlib.sha256).hexdigest()))
       */
      new Uint8Array([
        220, 42, 88, 211, 143, 102, 221, 79, 181, 128, 183, 215, 151, 98, 170,
        199, 206, 115, 28, 53, 68, 75, 26, 182, 248, 218, 155, 216, 188, 119,
        97, 228,
      ])
  );
});
