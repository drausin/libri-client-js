
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const id = require('./id');

test('ID.string returns a 64-char', () => {
  const id1 = id.newRandom();
  expect(id1.string().length).toEqual(64);
});

test('ID.compare works as expected', () => {
  const idBytes1 = new Uint8Array(id.length);
  idBytes1[0] = 1;
  const id1 = new id.ID(idBytes1);
  const id2 = new id.ID(new Uint8Array(id.length));
  const id3 = new id.ID(new Uint8Array(id.length));

  expect(id1.compare(id2)).toEqual(1);
  expect(id2.compare(id1)).toEqual(-1);
  expect(id2.compare(id3)).toEqual(0);
});
