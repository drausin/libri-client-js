// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const ctesting = require('../../common/testing');
const docstest = require('../../librarian/api/testing');
const keys = require('./keys');
const page = require('./page');
const pack = require('./pack');

test('pack yields a document with expected uncompressed size', () => {
  const rng = new Math.seedrandom(0);  // eslint-disable-line new-cap
  const uncompressedSize = page.defaultSize / 2;
  const singlePageContent = ctesting.newCompressibleBytes(rng,
      uncompressedSize);
  const mediaType = 'application/x-pdf';
  const eekP = keys.newEEK();
  const authorPub = docstest.randBytes(rng, 65);

  return eekP.then((eek) => {
    return pack.pack(singlePageContent, mediaType, eek, authorPub);
  }).then((docMetadata) => {
    return expect(
        docMetadata.metadata.getUncompressedSize()
    ).toEqual(uncompressedSize);
  });
});
