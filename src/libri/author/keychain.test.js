
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const keychain = require('./keychain.js');

test('get returns key when it has a match', () => {
  const kc = keychain.newKeychain(3);
  expect(kc.get('not a present pub key')).toBeNull();
  const priv = kc.privs[kc.pubs[0]];
  expect(kc.get(priv.pubKeyBytes)).toEqual(priv);
});

test('sample returns key', () => {
  const kc = keychain.newKeychain(3);
  const key1 = kc.sample();
  const key2 = kc.get(key1.pubKeyBytes);
  expect(key1).toEqual(key2);
});
