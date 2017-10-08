// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const ecid = require('../common/ecid');
const keychain = require('./keychain');
const author = require('./author');
const docslib = require('../librarian/api/documents');
const ship = require('./io/ship');
const testing = require('../common/testing');
const authorconfig = require('./config');


test('upload -> download = original', async () => {
  let libriDocs = {};
  const publisher = new function() {};
  publisher.publish = jest.fn((doc, _1, _2) => {
    return docslib.getKey(doc).then((docKey) => {
      libriDocs[docKey.string()] = doc;
      return docKey;
    });
  });
  let acquirer = new function() {};
  acquirer.acquire = jest.fn((docKey, _1, _2) => {
    const doc = libriDocs[docKey.string()];
    return new Promise((resolve, _) => {
      if (doc !== undefined) {
        resolve(doc);
      }
      resolve(null);
    });
  });
  const librarians = new function() {};
  librarians.next = jest.fn(() => {
    return null;
  });

  const rng = seedrandom(0);
  const config = new authorconfig.Config();
  const authorKeys = keychain.newKeychain(3);
  const selfReaderKeys = keychain.newKeychain(3);
  const allKeys = keychain.newUnion([authorKeys, selfReaderKeys]);
  const shipper = new ship.Shipper(librarians, publisher);
  const receiver = new ship.Receiver(librarians, acquirer, allKeys);
  const auth = new author.Author(config, authorKeys, selfReaderKeys, shipper,
      receiver);

  const pageSizes = [128, 256, 512];
  const uncompressedSizes = [128, 192, 256, 384];
  const mediaTypes = ['applications/x-pdf', 'application/x-gzip'];
  const cases = caseCrossProduct(pageSizes, uncompressedSizes, mediaTypes);

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // since there's a lot going on in
                                            // each upload and download call
  expect.assertions(cases.length);
  for (let c = 0; c < cases.length; c++) {
    auth.config.pageSize = cases[c].pageSize;
    const uncompressedSize = cases[c].uncompressedSize;
    const mediaType = cases[c].mediaType;
    const content1 = testing.newCompressibleBytes(rng, uncompressedSize);

    // do upload -> download
    const envDocKey = await auth.upload(content1, mediaType);
    const content2 = await auth.download(envDocKey.key);

    // check
    expect(content2).toEqual(content1);
  }
});

test('newAuthor works as expected', () => {
  const config = new authorconfig.Config();
  const clientID = ecid.newRandom();
  const authorKeys = keychain.newKeychain(3);
  const selfReaderKeys = keychain.newKeychain(3);
  const auth = author.newAuthor(config, clientID, authorKeys, selfReaderKeys);
  expect(auth.config).toEqual(config);
  expect(auth.authorKeys).toEqual(authorKeys);
  expect(auth.selfReaderKeys).toEqual(selfReaderKeys);
  expect(auth.shipper).toBeTruthy();
  expect(auth.receiver).toBeTruthy();
});

/**
 * Enumerate the case cross product across the sets of parameters.
 *
 * @param {[]} pageSizes
 * @param {[]} uncompressedSizes
 * @param {[]} mediaTypes
 * @return {Array}
 */
function caseCrossProduct(pageSizes: [], uncompressedSizes: [],
    mediaTypes: []): [{}] {
  let cases = [];
  for (let i = 0; i < pageSizes.length; i++) {
    for (let j = 0; j < uncompressedSizes.length; j++) {
      for (let k = 0; k < mediaTypes.length; k++) {
        cases.push({
          pageSize: pageSizes[i],
          uncompressedSize: uncompressedSizes[j],
          mediaType: mediaTypes[k],
        });
      }
    }
  }
  return cases;
}
