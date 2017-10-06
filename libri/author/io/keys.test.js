// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const docstest = require('../../librarian/api/testing');
const keys = require('./keys');
const ecid = require('../../common/ecid');

test('newKEK(priv1, pub2) generates same KEK as newKEK(priv2, pub1)', () => {
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP1 = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  const kekP2 = keys.newKEK(readerKey.key, authorKey.pubKeyBytes);
  expect.assertions(1);
  return Promise.all([kekP1, kekP2]).then((args) => {
    return expect(args[0]).toEqual(args[1]);
  });
});

test('unmarshalKEK -> marshalKEK = original', () => {
  const rng = seedrandom(0);
  const marshaled = docstest.randBytes(rng, keys.kekLength);
  expect.assertions(1);
  return keys.unmarshalKEK(marshaled).then((unmarshaled) => {
    return expect(keys.marshallKEK(unmarshaled)).resolves.toEqual(marshaled);
  });
});

test('unmarshalKEK throws error when kekBytes is wrong length', () => {
  expect(() => {
    keys.unmarshalKEK(new Uint8Array(0));
  }).toThrow();
});

test('KEK.encrypt -> KEK.decrypt = original EEK', () => {
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  const eekP = keys.newEEK();
  expect.assertions(1);
  return Promise.all([eekP, kekP]).then((args) => {
    const original = args[0];
    const kek = args[1];
    return kek.encrypt(original).then((encEEK) => {
      return kek.decrypt(encEEK.ciphertext, encEEK.ciphertextMAC);
    }).then((encDecEEK) => {
      return expect(encDecEEK).toEqual(original);
    });
  });
});

test('KEK.decrypt throws error on unexpected MAC', async () => {
  const rng = seedrandom(0);
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kek = await keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  expect(() => {
    kek.decrypt(docstest.randBytes(rng, 64), docstest.randBytes(rng, 32));
  }).resolves.toThrowError('unexpected EEK MAC');
});

test('unmarshalEEK -> marshalEEK = original', () => {
  const rng = seedrandom(0);
  const marshaled = docstest.randBytes(rng, keys.eekLength);
  expect.assertions(1);
  return keys.unmarshalEEK(marshaled).then((unmarshaled) => {
    return expect(keys.marshallEEK(unmarshaled)).resolves.toEqual(marshaled);
  });
});
