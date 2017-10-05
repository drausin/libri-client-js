// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();
const webcrypto = window.crypto.subtle;

const hkdf = require('./hkdf');

test('HKDF satisfies RFC 5869 test case', async () => {
  const hashAlg = 'SHA-256';
  const ikm = hexToByteArray('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b');
  const salt = hexToByteArray('000102030405060708090a0b0c');
  const info = hexToByteArray('f0f1f2f3f4f5f6f7f8f9');
  const prkP = webcrypto.importKey(
      'raw',
      hexToByteArray(
          '077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5'),
      {name: 'HMAC', hash: {name: hashAlg}},
      false,
      ['sign']
  );
  const okm = hexToByteArray('3cb25f25faacd57a90434f64d0362f2a2d2d0a9' +
      '0cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865');

  // derive pseudorandom key
  const kdf = new hkdf.HKDF(hashAlg, ikm, salt);
  expect.assertions(2);

  // check actual PRK against expected value
  await Promise.all([prkP, kdf.keyP]).then((args) => {
    return expect(args[0]).toEqual(args[1]);
  });

  // check derived key against expected output keying material (OKM)
  await expect(kdf.derive(42, info)).resolves.toEqual(okm);
});

test('HKDF satisfies RFC 5869 test case w/o salt or info', () => {
  const hashAlg = 'SHA-256';
  const ikm = hexToByteArray('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b');
  const okm = hexToByteArray('8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1' +
      '879ec3454e5f3c738d2d9d201395faa4b61a96c8');
  const kdf = new hkdf.HKDF(hashAlg, ikm);

  // check derived key against expected output keying material (OKM)
  expect.assertions(1);
  return expect(kdf.derive(42)).resolves.toEqual(okm);
});


/**
 * Convert a hex string into a byte array.
 *
 * @param {string} hex - hex string
 * @return {Uint8Array}
 */
function hexToByteArray(hex) {
  let a = [];
  for (let i = 0; i < hex.length; i += 2) {
    a.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(a);
}
