// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

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
      return kek.decrypt(encEEK);
    }).then((encDecEEK) => {
      return expect(encDecEEK).toEqual(original);
    });
  });
});

test('marshalEEK -> unmarshallEEK = original', () => {
  expect.assertions(1);
  return keys.newEEK().then((original) => {
    return expect(
        keys.marshallEEK(original).then((marshalled) => {
          return keys.unmarshalEEK(marshalled);
        })
    ).resolves.toEqual(original);
  });
});

