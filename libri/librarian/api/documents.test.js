
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const docs = require('./documents_pb');
const docslib = require('./documents');
import * as docstest from './testing';

test('getKey returns consistent keys', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const doc = docstest.newDocument(rng);
  const key1 = docslib.getKey(doc);
  const key2 = docslib.getKey(doc);
  expect(key1).toEqual(key2);
});

test('getAuthorPub works on all document types', () => {
  const rng = seedrandom(0);
  const authorPub = docstest.randBytes(rng, 65);

  // test envelope
  const env = new docs.Envelope();
  env.setAuthorPublicKey(authorPub);
  const envDoc = new docs.Document();
  envDoc.setEnvelope(env);
  expect(docslib.getAuthorPub(envDoc)).toEqual(authorPub);

  // test entry
  const entry = new docs.Entry();
  entry.setAuthorPublicKey(authorPub);
  const entryDoc = new docs.Document();
  entryDoc.setEntry(entry);
  expect(docslib.getAuthorPub(entryDoc)).toEqual(authorPub);

  // test page
  const page = new docs.Page();
  page.setAuthorPublicKey(authorPub);
  const pageDoc = new docs.Document();
  pageDoc.setPage(page);
  expect(docslib.getAuthorPub(pageDoc)).toEqual(authorPub);
});
