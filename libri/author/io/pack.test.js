// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const ctesting = require('../../common/testing');
const docstest = require('../../librarian/api/testing');
const keys = require('./keys');
const page = require('./page');
const pack = require('./pack');

test('pack yields a entryDocKey with expected uncompressed size', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const uncompressedSize = page.defaultSize / 2;
  const singlePageContent = ctesting.newCompressibleBytes(rng,
      uncompressedSize);
  const mediaType = 'application/x-pdf';
  const eekP = keys.newEEK();
  const authorPub = docstest.randBytes(rng, 65);

  expect.assertions(1);
  return eekP.then((eek) => {
    return pack.pack(singlePageContent, mediaType, eek, authorPub);
  }).then((packedEntry) => {
    return expect(
        packedEntry.metadata.getUncompressedSize()
    ).toEqual(uncompressedSize);
  });
});

test('pack + unpack = original', async () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const eekP = keys.newEEK();
  const authorPub = docstest.randBytes(rng, 65);
  const pageSizes = [128, 256, 512, 1024];
  const uncompressedSizes = [128, 192, 256, 384, 512, 768, 1024, 2048, 4096,
    8192];
  const mediaTypes = ['application/x-pdf', 'application/x-gzip'];

  const cases = caseCrossProduct(pageSizes, uncompressedSizes, mediaTypes);
  expect.assertions(cases.length);
  for (let i = 0; i < cases.length; i++) {
    const uncompressedSize = cases[i]['uncompressedSize'];
    const pageSize = cases[i]['pageSize'];
    const mediaType = cases[i]['mediaType'];
    const content = ctesting.newCompressibleBytes(rng, uncompressedSize);
    await eekP.then((eek) => {
      return pack.pack(content, mediaType, eek, authorPub, pageSize)
      .then((packedEntry) => {
        return pack.unpack(packedEntry.entryDocKey.document,
            packedEntry.pageDocKeys, eek);
      }).then((unpackedContent) => {
        return expect(unpackedContent.content).toEqual(content);
      });
    });
  }
});

/**
 * Generate the cross product of all parameters.
 * @param {Array.<number>} pageSizes
 * @param {Array.<number>}uncompressedSizes
 * @param {Array.<string>} mediaTypes
 * @return {Array.<{}>}
 */
function caseCrossProduct(pageSizes, uncompressedSizes, mediaTypes) {
  let cases = [];
  let c = 0;
  for (let i = 0; i < pageSizes.length; i++) {
    for (let j = 0; j < uncompressedSizes.length; j++) {
      for (let k = 0; k < mediaTypes.length; k++) {
        cases[c] = {
          'pageSize': pageSizes[i],
          'uncompressedSize': uncompressedSizes[j],
          'mediaType': mediaTypes[k],
        };
        c++;
      }
    }
  }
  return cases;
}
