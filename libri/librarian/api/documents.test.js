
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const docslib = require('./documents');
import * as docstest from './testing';

test('getKey returns consistent keys', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const doc = docstest.newDocument(rng);
  const key1 = docslib.getKey(doc);
  const key2 = docslib.getKey(doc);
  expect(key1).toEqual(key2);
});
