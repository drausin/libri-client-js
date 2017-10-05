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

test('marshalKEK -> unmarshalKEK = original', () => {
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  expect.assertions(1);
  return kekP.then((original) => {
    return expect(
        keys.marshallKEK(original).then((marshalled) => {
          return keys.unmarshalKEK(marshalled);
        })
    ).resolves.toEqual(original);
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

test('KEK.decrypt throws error on unexpected MAC', () => {
  const rng = seedrandom(0);
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  return kekP.then((kek) => {
    return expect(() => {
      kek.decrypt(docstest.randBytes(rng, 64), docstest.randBytes(rng, 32));
    }).toThrowError('unexpected EEK MAC');
  });
});

test('marshalEEK -> unmarshalEEK = original', () => {
  expect.assertions(1);
  return keys.newEEK().then((original) => {
    return expect(
        keys.marshallEEK(original).then((marshalled) => {
          return keys.unmarshalEEK(marshalled);
        })
    ).resolves.toEqual(original);
  });
});

test('unmarshalEEK throws error when kekBytes is wrong length', () => {
  expect(() => {
    keys.unmarshalEEK(new Uint8Array(0));
  }).toThrow();
});


