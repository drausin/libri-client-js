// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const authorconfig = require('../author/config');
const author = require('../author/author');
const ecid = require('../common/ecid');
const keychain = require('../author/keychain');
const testing = require('../common/testing');

// some constants we'll use across all tests
const rng = seedrandom(0);
const config = new authorconfig.Config();
config.librarianAddrs = process.env.librarian_addrs.split(',');

const clientID = ecid.newRandom();
const authorKeys = keychain.newKeychain(3);
const selfReaderKeys = keychain.newKeychain(3);
const a = author.newAuthor(config, clientID, authorKeys, selfReaderKeys);

test('can upload & download an 8 KB pdf', () => {
  return testUploadDownload(8 * 1024, 'application/x-pdf');
});

/*
test('can upload & download a 256 KB pdf', () => {
  return testUploadDownload(256 * 1024, 'application/x-pdf');
});

test('can upload & download a 4 MB pdf', () => {
  expect.assertions(1);
  return testUploadDownload(4 * 1024 * 1024, 'application/x-pdf');
});

test('can upload & download a 10 MB pdf', () => {
  expect.assertions(1);
  return testUploadDownload(10 * 1024 * 1024, 'application/x-pdf');
});

test('can upload & download an 8 KB compressed file', () => {
  expect.assertions(1);
  return testUploadDownload(8 * 1024, 'application/x-gzip');
});

test('can upload & download a 256 KB compressed file', () => {
  expect.assertions(1);
  return testUploadDownload(256 * 1024, 'application/x-gzip');
});

test('can upload & download a 4 MB compressed file', () => {
  expect.assertions(1);
  return testUploadDownload(4 * 1024 * 1024, 'application/x-gzip');
});

test('can upload & download a 10 MB compressed file', () => {
  expect.assertions(1);
  return testUploadDownload(10 * 1024 * 1024, 'application/x-gzip');
});
*/

/**
 * Test uploading and downloading content of given size and media type.
 *
 * @param {number} contentSize
 * @param {string} mediaType
 * @return {*}
 */
function testUploadDownload(contentSize, mediaType) {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  const originalContent = testing.newCompressibleBytes(rng, contentSize);
  expect.assertions(1);
  return a.upload(originalContent, mediaType).then((envDocKey) => {
    return envDocKey.key;
  }).then((envKey) => {
    return a.download(envKey);
  }).then((downloadedContent) => {
    return expect(downloadedContent).toEqual(originalContent);
  });
}
