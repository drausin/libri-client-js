// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const keys = require('./keys');
const page = require('./page');

test('paginate + unpaginate = original', async () => {
  const compressedSizes = [32, 64, 128, 192, 256, 384, 512, 768, 1024, 2048,
    4096, 8192];
  const pageSizes = [128, 256, 512, 1024];
  const eekKeys = keys.newEEK();
  const authorPub = new Uint8Array(65);
  window.crypto.getRandomValues(authorPub);

  expect.assertions(compressedSizes.length * pageSizes.length);
  for (let i = 0; i < compressedSizes.length; i++) {
    const original = new Uint8Array(compressedSizes[i]);
    window.crypto.getRandomValues(original);
    for (let j = 0; j < pageSizes.length; j++) {
      await eekKeys.then((eekKeys2) => {
        return expect(
            page.paginate(
                original, eekKeys2, authorPub, pageSizes[0]
            ).then((pages) => {
              return page.unpaginate(pages, eekKeys2);
            })
        ).resolves.toEqual(original);
      });
    }
  }
});
