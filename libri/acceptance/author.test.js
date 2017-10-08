// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const authorconfig = require('../author/config');
const author = require('../author/author');
const ecid = require('../common/ecid');
const keychain = require('../author/keychain');
const testing = require('../common/testing');

test('can upload and download a document', async () => {
  const config = new authorconfig.Config();
  config.librarianAddrs = [
    'localhost:20100',
    // 'localhost:20101',
    // 'localhost:20102',
  ];
  const clientID = ecid.newRandom();
  const authorKeys = keychain.newKeychain(3);
  const selfReaderKeys = keychain.newKeychain(3);
  const a = author.newAuthor(config, clientID, authorKeys, selfReaderKeys);

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // since there's a lot going on in
                                            // each upload and download call
  // create content
  const rng = seedrandom(0);
  const contentSize = 256; // bytes
  const mediaType = 'application/x-pdf';
  const content1 = testing.newCompressibleBytes(rng, contentSize);

  // do upload -> download
  const envDocKey = await a.upload(content1, mediaType);
  const content2 = await a.download(envDocKey.key);

  // check
  expect(content2).toEqual(content1);
});
