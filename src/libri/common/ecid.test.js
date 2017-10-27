
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

import * as ecid from './ecid';

test('newRandom successfully generates a new ID', () => {
  const id = ecid.newRandom();
  expect(id).toBeTruthy();
  expect(id.pubKeyBytes).toBeInstanceOf(Uint8Array);
  expect(id.pubKeyBytes.length).toEqual(65); // uncompressed encoding
});

test('fromPrivateKey can re-create ID', () => {
  const id1 = ecid.newRandom();
  const id2 = ecid.fromPrivateKey(id1.key.getPrivate());
  expect(id1).toEqual(id2);
});
