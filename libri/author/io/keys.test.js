// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const keys = require('./keys');

test('marshalEEK -> unmarshallEEK = original', async () => {
  expect.assertions(1);
  return keys.newEEK().then((original) => {
    return expect(
        keys.marshallEEK(original).then((marshalled) => {
          return keys.unmarshalEEK(marshalled);
        })
    ).resolves.toEqual(original);
  });
});
